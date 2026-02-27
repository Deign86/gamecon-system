# Anthropic Agent Skills — Available Skills Registry

This file registers all available Anthropic Agent Skills cloned into `.skills/anthropic-skills/skills/`.
When a user request matches a skill's trigger conditions, read the corresponding `SKILL.md` file
(and any referenced sub-files) to load the full instructions before proceeding.

---

## How to Use Skills

1. **Match** the user's request against the skill descriptions below.
2. **Load** the `SKILL.md` file at the listed path using `read_file`.
3. **Follow** the instructions in the SKILL.md precisely — they contain step-by-step workflows, templates, scripts, and guidelines.
4. If the skill references additional files (scripts, templates, references), load those as needed from the same directory.

---

## Available Skills

### 1. frontend-design
- **Trigger:** Creating distinctive, production-grade frontend interfaces; web components, pages, dashboards, React components, HTML/CSS layouts, styling/beautifying web UI.
- **Path:** `.skills/anthropic-skills/skills/frontend-design/SKILL.md`
- **Extra files:** None

### 2. webapp-testing
- **Trigger:** Interacting with and testing local web applications using Playwright; verifying frontend functionality, debugging UI behavior, capturing screenshots, viewing browser logs.
- **Path:** `.skills/anthropic-skills/skills/webapp-testing/SKILL.md`
- **Extra files:** `scripts/with_server.py`, `examples/` (3 Python scripts)

### 3. web-artifacts-builder
- **Trigger:** Creating elaborate, multi-component HTML artifacts using React, Tailwind CSS, and shadcn/ui; complex artifacts requiring state management or routing.
- **Path:** `.skills/anthropic-skills/skills/web-artifacts-builder/SKILL.md`
- **Extra files:** `scripts/init-artifact.sh`, `scripts/bundle-artifact.sh`

### 4. mcp-builder
- **Trigger:** Creating MCP (Model Context Protocol) servers in Python (FastMCP) or Node/TypeScript; building tool servers for LLMs.
- **Path:** `.skills/anthropic-skills/skills/mcp-builder/SKILL.md`
- **Extra files:** `reference/` (4 docs), `scripts/` (4 files)

### 5. skill-creator
- **Trigger:** Creating new skills, modifying/improving existing skills, measuring skill performance, running evals, benchmarking, or optimizing skill descriptions.
- **Path:** `.skills/anthropic-skills/skills/skill-creator/SKILL.md`
- **Extra files:** `agents/` (3), `scripts/` (9), `references/` (1), `assets/` (1), `eval-viewer/` (2)

### 6. docx
- **Trigger:** Creating, reading, editing, or manipulating Word documents (.docx files); reports, memos, letters, templates as Word files.
- **Path:** `.skills/anthropic-skills/skills/docx/SKILL.md`
- **Extra files:** `scripts/` (multiple Python scripts + templates)

### 7. pdf
- **Trigger:** Anything with PDF files — reading, extracting, merging, splitting, rotating, watermarking, creating, form-filling, encrypting/decrypting, OCR, image extraction.
- **Path:** `.skills/anthropic-skills/skills/pdf/SKILL.md`
- **Extra files:** `forms.md`, `reference.md`, `scripts/` (8 Python scripts)

### 8. pptx
- **Trigger:** Creating, reading, editing PowerPoint files (.pptx); combining, splitting slides, working with templates/layouts/notes.
- **Path:** `.skills/anthropic-skills/skills/pptx/SKILL.md`
- **Extra files:** `editing.md`, `pptxgenjs.md`, `scripts/` (5+ files)

### 9. xlsx
- **Trigger:** Working with spreadsheet files (.xlsx/.xlsm/.csv/.tsv) — open, read, edit, create, format, chart, formula work, data cleaning.
- **Path:** `.skills/anthropic-skills/skills/xlsx/SKILL.md`
- **Extra files:** `scripts/` (recalc.py + office/ tools)

### 10. algorithmic-art
- **Trigger:** Creating generative/algorithmic art using p5.js; flow fields, particle systems, interactive visualizations.
- **Path:** `.skills/anthropic-skills/skills/algorithmic-art/SKILL.md`
- **Extra files:** `templates/generator_template.js`, `templates/viewer.html`

### 11. canvas-design
- **Trigger:** Creating visual art in .png and .pdf — posters, art, designs, static visual pieces.
- **Path:** `.skills/anthropic-skills/skills/canvas-design/SKILL.md`
- **Extra files:** `canvas-fonts/` (80+ .ttf font files)

### 12. brand-guidelines
- **Trigger:** Applying Anthropic's brand colors and typography to artifacts; brand/style guideline requests.
- **Path:** `.skills/anthropic-skills/skills/brand-guidelines/SKILL.md`
- **Extra files:** None

### 13. theme-factory
- **Trigger:** Styling artifacts with a visual theme — slides, docs, reports, HTML pages; 10 pre-set themes or custom themes.
- **Path:** `.skills/anthropic-skills/skills/theme-factory/SKILL.md`
- **Extra files:** `themes/` (10 theme .md files), `theme-showcase.pdf`

### 14. doc-coauthoring
- **Trigger:** Co-authoring documentation — proposals, technical specs, decision docs, structured content through a collaborative workflow.
- **Path:** `.skills/anthropic-skills/skills/doc-coauthoring/SKILL.md`
- **Extra files:** None

### 15. internal-comms
- **Trigger:** Writing internal communications — status reports, leadership updates, 3P updates, newsletters, FAQs, incident reports, project updates.
- **Path:** `.skills/anthropic-skills/skills/internal-comms/SKILL.md`
- **Extra files:** `examples/` (4 template .md files)

### 16. slack-gif-creator
- **Trigger:** Creating animated GIFs optimized for Slack — emoji-size or message-size animated images.
- **Path:** `.skills/anthropic-skills/skills/slack-gif-creator/SKILL.md`
- **Extra files:** `core/` (4 Python modules), `requirements.txt`
