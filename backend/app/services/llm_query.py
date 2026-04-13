from langchain_core.prompts import PromptTemplate
from langchain_community.llms import LlamaCpp
import json

# Load Llama model
llm = LlamaCpp(
    model_path="models/llama-3.gguf",  # update path
    temperature=0.2,
    max_tokens=512,
    n_ctx=2048
)


def build_context(data):
    threats = data.get("threats", {})
    clusters = data.get("clusters", {})
    fused = data.get("fused_intelligence", {})

    context = {
        "total_objects": len(threats),
        "high_threats": [
            k for k, v in threats.items() if v.get("level") == "HIGH"
        ],
        "convoys": [
            k for k, c in clusters.items() if c != -1
        ],
        "fused_objects": fused
    }

    return json.dumps(context, indent=2)


prompt_template = PromptTemplate(
    input_variables=["context", "question"],
    template="""
You are a battlefield intelligence AI assistant.

Context:
{context}

Question:
{question}

Instructions:
- Be precise
- Give tactical insight
- Suggest action if needed

Answer:
"""
)


def ask_llm(question, data):
    context = build_context(data)

    prompt = prompt_template.format(
        context=context,
        question=question
    )

    response = llm(prompt)

    return response.strip()