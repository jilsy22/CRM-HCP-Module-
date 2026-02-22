"""
Standalone async test that runs the agent directly to get the full Python traceback.
"""
import asyncio
import sys
import os
import traceback as tb

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.chdir(os.path.join(os.path.dirname(__file__), "backend"))

async def main():
    try:
        from app.database import AsyncSessionLocal, init_db
        await init_db()

        async with AsyncSessionLocal() as db:
            from app.agent.agent import create_agent
            from langchain_core.messages import HumanMessage

            print("Creating agent...")
            agent = create_agent(db)
            print("Agent created OK")

            config = {"configurable": {"thread_id": "debug-001"}}
            print("Invoking agent with 'Search for cardiologists'...")
            result = await agent.ainvoke(
                {"messages": [HumanMessage(content="Search for cardiologists in North territory")]},
                config=config,
            )
            ai_messages = [m for m in result["messages"] if m.type == "ai"]
            print("\n✅ RESPONSE:")
            print(ai_messages[-1].content if ai_messages else "No response")

    except Exception as e:
        print("\n❌ ERROR:")
        tb.print_exc()

asyncio.run(main())
