import asyncio
import json
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import HumanMessage

from ..database import get_db
from ..schemas import ChatMessageRequest, ChatMessageResponse
from ..agent.agent import create_agent

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/", response_model=ChatMessageResponse)
async def chat(request: ChatMessageRequest, db: AsyncSession = Depends(get_db)):
    """
    Standard (non-streaming) chat endpoint.
    Accepts a user message and session_id, invokes the LangGraph agent,
    and returns the final response.
    """
    agent = create_agent(db)
    config = {"configurable": {"thread_id": request.session_id}}

    try:
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=request.message)]},
            config=config,
        )

        # Extract the last AI message
        ai_messages = [m for m in result["messages"] if m.type == "ai"]
        response_text = ai_messages[-1].content if ai_messages else "I could not process your request."

        # Extract tool calls info
        tool_calls_info = []
        for msg in result["messages"]:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_calls_info.append({
                        "tool_name": tc.get("name", ""),
                        "tool_input": tc.get("args", {}),
                    })

        return ChatMessageResponse(
            session_id=request.session_id,
            response=response_text,
            tool_calls=tool_calls_info,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.post("/stream")
async def chat_stream(request: ChatMessageRequest, db: AsyncSession = Depends(get_db)):
    """
    Server-Sent Events (SSE) streaming chat endpoint.
    Streams tokens and tool call events back to the client in real time.
    """
    agent = create_agent(db)
    config = {"configurable": {"thread_id": request.session_id}}

    async def event_generator() -> AsyncIterator[str]:
        try:
            async for event in agent.astream_events(
                {"messages": [HumanMessage(content=request.message)]},
                config=config,
                version="v2",
            ):
                kind = event.get("event", "")
                data = event.get("data", {})
                name = event.get("name", "")

                if kind == "on_chat_model_stream":
                    chunk = data.get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        payload = json.dumps({"type": "token", "content": chunk.content})
                        yield f"data: {payload}\n\n"

                elif kind == "on_tool_start":
                    payload = json.dumps({
                        "type": "tool_start",
                        "tool": name,
                        "input": data.get("input", {}),
                    })
                    yield f"data: {payload}\n\n"

                elif kind == "on_tool_end":
                    output = data.get("output", "")
                    payload = json.dumps({
                        "type": "tool_end",
                        "tool": name,
                        "output": str(output)[:500],  # truncate long outputs
                    })
                    yield f"data: {payload}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            error_payload = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Return a new or existing session ID."""
    return {"session_id": session_id or str(uuid.uuid4())}


@router.get("/new-session")
async def new_session():
    """Generate a fresh session ID."""
    return {"session_id": str(uuid.uuid4())}
