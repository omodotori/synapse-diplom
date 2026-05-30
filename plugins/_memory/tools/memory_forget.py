from helpers.tool import Tool, Response
from plugins._memory.helpers.memory import Memory

from tools.memory_load import DEFAULT_THRESHOLD


class MemoryForget(Tool):

    async def execute(self, query: str = "", threshold: float = DEFAULT_THRESHOLD, **kwargs):
        search_filter = kwargs.get("filter", "")
        db = await Memory.get(self.agent)
        try:
            threshold = float(threshold)
        except (TypeError, ValueError) as e:
            raise ValueError(f"memory_forget: invalid threshold: {e}")

        dels = await db.delete_documents_by_query(query=query, threshold=threshold, filter=search_filter)

        result = self.agent.read_prompt("fw.memories_deleted.md", memory_count=len(dels))
        return Response(message=result, break_loop=False)
