from helpers.tool import Tool, Response
from plugins._memory.helpers.memory import Memory

DEFAULT_THRESHOLD = 0.7
DEFAULT_LIMIT = 10


class MemoryLoad(Tool):

    async def execute(self, query: str = "", threshold: float = DEFAULT_THRESHOLD, limit: int = DEFAULT_LIMIT, **kwargs):
        search_filter = kwargs.get("filter", "")
        db = await Memory.get(self.agent)
        try:
            limit = int(limit)
            threshold = float(threshold)
        except (TypeError, ValueError) as e:
            raise ValueError(f"memory_load: invalid limit or threshold: {e}")

        docs = await db.search_similarity_threshold(
            query=query, 
            limit=limit, 
            threshold=threshold, 
            filter=search_filter
        )

        if len(docs) == 0:
            result = self.agent.read_prompt("fw.memories_not_found.md", query=query)
        else:
            text = "\n\n".join(Memory.format_docs_plain(docs))
            result = str(text)

        return Response(message=result, break_loop=False)
