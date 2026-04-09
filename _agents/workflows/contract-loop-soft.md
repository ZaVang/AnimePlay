---
description: Start the Auto-Hooked Soft-Isolation Contract Loop (Runs infinitely until Evaluator passes).
argument-hint: "PROMPT"
allowed-tools: Bash, etc
---

# 🤖 Contract-Loop (Soft Auto-Machine)

This workflow utilizes the `hooks.json` engine to enforce infinite looping until conditions are met.

### Step 1: Arm the Hook

Run this command immediately to initialize the state file `docs/.contract_active`. This triggers the `stop.sh` hook on your session, preventing you from ever stopping until you explicitly output `<promise>sprint_complete</promise>`.

```bash
// turbo-all
mkdir -p docs
cat << 'EOF' > docs/.contract_active
---
iteration: 0
max_iterations: 20
completion_promise: "sprint_complete"
---
EOF
```

### Step 2: Begin the Contract-Loop Protocol

You are now the **Orchestrator** trapped in a loop. You MUST roleplay through these stages sequentially:

1. **Planner Phase**: Read the User Prompt: `$ARGUMENTS`. Write out a high-level product architecture to `docs/product_spec.md`.
2. **Architect Phase**: Read `docs/product_spec.md` and draft `docs/sprint_contract.md` detailing the Exact API/Code features needed to pass this sprint.
3. **Generator Phase**: Write the actual code required by `sprint_contract.md`. 
4. **Evaluator Phase**: Test the code. If it fails, append the reason to `docs/pitfalls.md`, and yield (stop responding). The Hook will bounce you back and force you to continue!

**EXIT CONDITION**: Only when the Evaluator Phase has independently confirmed all tests pass, you must output exactly `<promise>sprint_complete</promise>`. This is the ONLY way the hook will let you exit the conversation. Do not output the promise while the code is failing.
