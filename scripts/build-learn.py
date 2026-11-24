#!/usr/bin/env python3
"""Builds the Learn pages from data/guides.json.

The guides are written once, in the app repository's SudokuGuides package, and exported with:

    swift run --package-path GuideExport guide-export <this repository>/data/guides.json

Then, from this repository:

    python3 scripts/build-learn.py

That writes a page per technique guide to learn/<slug>.html from scripts/learn/technique.html,
with any hand-written sections in scripts/learn/extras/<slug>.html after the guide's own. It
also fills the regions marked <!-- guides:name --> … <!-- /guides:name --> in learn.html (the
lessons), learn/how-to-play.html (the rules steps, its lesson number and navigation) and
sitemap.xml. Everything outside those regions is hand-written and left alone.

The website is in English, so the copy is the guides' source language, British English.
"""

import html
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGUAGE = "en-GB"

# Each page's address, by the guide's id. An address outlives the guide's wording, so it is
# set here rather than worked out from the title.
SLUGS = {
    "nakedSingle": "naked-single",
    "hiddenSingle": "hidden-single",
    "lockedCandidatesPointing": "locked-candidates",
    "nakedPair": "naked-pairs",
    "hiddenPair": "hidden-pairs",
    "bug": "bug",
    "xWing": "x-wing",
    "uniqueRectangleType1": "unique-rectangles",
    "swordfish": "swordfish",
    "xyWing": "xy-wing",
    "xyzWing": "xyz-wing",
    "skyscraper": "skyscraper",
    "twoStringKite": "two-string-kite",
    "crane": "crane",
    "emptyRectangle": "empty-rectangle",
    "wWing": "w-wing",
    "jellyfish": "jellyfish",
    "fourYWing": "y-wings",
}

# The dot on a level's badge, easiest first.
LEVEL_DOTS = {
    "easy": "bg-highlight-green",
    "medium": "bg-highlight-blue",
    "hard": "bg-highlight-orange",
    "expert": "bg-highlight-red",
    "professional": "bg-highlight-yellow",
    "grandmaster": "bg-primaryFg",
}

# The app words its variant sections' titles itself; these are its English.
VARIANT_TITLES = {
    "withAFin": "With a Fin",
    "triplesAndQuads": "Triples and Quads",
    "withMoreSquares": "With More Squares",
}

# A worked example's three frames, as the guides describe them.
FRAME_TITLES = ["Spot it", "Why it works", "What it does"]

HOW_TO_PLAY = {
    "slug": "how-to-play",
    "title": "How to Play",
    "level": {"id": "easy", "name": "Beginner"},
    "blurb": "The three rules of Sudoku, explained step by step for complete beginners.",
}


def text(copy):
    """A piece of guide copy in the website's language, escaped for HTML."""
    return html.escape(copy[LANGUAGE], quote=False)


def attribute(value):
    return html.escape(value, quote=True)


def indent(block, spaces):
    pad = " " * spaces
    return "\n".join(pad + line if line.strip() else "" for line in block.splitlines())


def level_badge(level):
    return f'<span class="badge"><span class="dot {LEVEL_DOTS[level["id"]]}"></span>{html.escape(level["name"])}</span>'


def variant_title(variant):
    if variant["title"] == "type":
        return f'Type {variant["number"]}'
    return VARIANT_TITLES[variant["title"]]


def variant_id(variant):
    return variant_title(variant).lower().replace(" ", "-")


# ---------- Boards ----------

def square(s):
    return [s["row"], s["column"]]


def frame_data(frame):
    """A frame as js/learn.js's renderGuideBoard reads it: squares as [row, column] from 0."""
    data = {}
    highlights = []
    for h in frame["highlights"]:
        item = {"square": square(h["square"]), "role": h["role"]}
        if h.get("value"):
            item["value"] = h["value"]
        if h.get("notes") is not None:
            item["notes"] = "".join(map(str, h["notes"]))
        if h.get("spotlight"):
            item["spotlight"] = "".join(map(str, h["spotlight"]))
        if h.get("label"):
            item["label"] = h["label"][LANGUAGE]
        highlights.append(item)
    if highlights:
        data["highlights"] = highlights
    if frame["selection"]:
        data["selection"] = [square(s) for s in frame["selection"]]
    if frame["crossedOff"]:
        data["crossedOff"] = [square(n["square"]) + [n["number"]] for n in frame["crossedOff"]]
    marks = []
    for mark in frame["marks"]:
        if mark["kind"] == "house":
            marks.append({"house": mark["house"]})
        elif mark["kind"] == "square":
            marks.append({"square": square(mark["square"])})
        else:
            marks.append({"link": [square(mark["from"]), square(mark["to"])]})
    if marks:
        data["marks"] = marks
    return data


def guide_board(example, frame):
    payload = json.dumps(frame_data(frame), separators=(",", ":"))
    return (
        f'<div class="demo-board" data-givens="{example["givens"]}"\n'
        f'  data-notes="{"|".join(example["notes"])}"\n'
        f'  data-frame="{attribute(payload)}"></div>'
    )


def stepper(example, heading):
    slides = []
    for number, (frame, caption) in enumerate(zip(example["frames"], example["captions"]), 1):
        slides.append(f"""<figure class="stepper-slide md:grid-cols-2 gap-6 md:gap-10 items-center" data-slide>
{indent(guide_board(example, frame), 2)}
  <figcaption>
    <div class="flex items-center gap-3 mb-4">
      <span class="cell-num cell-num-sm">{number}</span>
      <h4 class="text-xl font-semibold">{FRAME_TITLES[number - 1]}</h4>
    </div>
    <p class="text-lg text-primaryFg/80">{text(caption)}</p>
  </figcaption>
</figure>""")
    return f"""<div class="glass rounded-[32px] p-5 md:p-8" data-stepper>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="eyebrow mb-1">Worked example</p>
      <h3 class="text-lg font-semibold">{html.escape(heading)}</h3>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-primaryFg/60 tabular-nums" data-counter></span>
      <button type="button" class="btn-glass btn-sm" data-prev>←</button>
      <button type="button" class="btn-primary btn-sm min-w-[7.5rem]" data-next>Next step</button>
    </div>
  </div>
  <div class="stepper-track mt-4 mb-6" data-track></div>

{indent(chr(10).join(slides), 2)}
</div>"""


# ---------- Technique pages ----------

def steps_list(steps):
    items = "\n".join(
        f'  <li class="flex gap-3"><span class="cell-num cell-num-sm shrink-0">{n}</span>'
        f'<span class="pt-0.5">{text(step)}</span></li>'
        for n, step in enumerate(steps, 1)
    )
    return f'<ol class="space-y-4">\n{items}\n</ol>'


def spot_and_does(technique):
    return f"""<div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
  <div class="glass rounded-[28px] p-6 md:p-8">
    <h3 class="eyebrow mb-5">How to spot it</h3>
{indent(steps_list(technique["howToSpotIt"]), 4)}
  </div>
  <div class="glass rounded-[28px] p-6 md:p-8 self-start">
    <h3 class="eyebrow mb-4">What it does</h3>
    <p class="text-primaryFg/80">{text(technique["whatItDoes"])}</p>
  </div>
</div>"""


def technique_card(technique, page_technique):
    """A variant's own card: its name, level and definition, and How to Spot It and What It Does
    where they differ from the page's."""
    parts = [f"""<div class="flex flex-wrap items-center justify-between gap-3 mb-3">
  <h3 class="text-xl font-bold">{text(technique["title"])}</h3>
  {level_badge(technique["level"])}
</div>
<p class="text-primaryFg/80">{text(technique["definition"])}</p>"""]
    if technique["howToSpotIt"] != page_technique["howToSpotIt"]:
        parts.append(f'<h4 class="eyebrow mt-7 mb-4">How to spot it</h4>\n{steps_list(technique["howToSpotIt"])}')
    if technique["whatItDoes"] != page_technique["whatItDoes"]:
        parts.append(f'<h4 class="eyebrow mt-7 mb-3">What it does</h4>\n<p class="text-primaryFg/80">{text(technique["whatItDoes"])}</p>')
    return f'<div class="glass rounded-[28px] p-6 md:p-8">\n{indent(chr(10).join(parts), 2)}\n</div>'


def variant_section(variant, page):
    techniques = {t["id"]: t for t in page["techniques"]}
    examples = {e["technique"]: e for e in page["examples"]}
    first = page["techniques"][0]
    parts = [f"""<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-4">{html.escape(variant_title(variant))}</h2>
<p class="text-lg md:text-xl text-primaryFg/80 max-w-3xl mb-8">{text(variant["text"])}</p>"""]
    for technique_id in variant["examples"]:
        heading = f'{techniques[technique_id]["title"][LANGUAGE]} in Action'
        parts.append(f'<div class="mb-5">\n{indent(stepper(examples[technique_id], heading), 2)}\n</div>')
    cards = [technique_card(techniques[t], first) for t in variant["techniques"]]
    columns = "grid-cols-1 md:grid-cols-2" if len(cards) > 1 else "grid-cols-1"
    parts.append(f'<div class="grid {columns} gap-5">\n{indent(chr(10).join(cards), 2)}\n</div>')
    return f"""<!-- {variant_title(variant)} -->
<section id="{variant_id(variant)}" class="scroll-mt-28 mb-20 md:mb-28">
{indent(chr(10).join(parts), 2)}
</section>"""


def related_section(page, pages):
    cards = []
    for related_id in page["related"]:
        related = pages[related_id]["techniques"][0]
        cards.append(f"""<a href="/learn/{SLUGS[related_id]}.html" class="glass glass-hover group flex flex-col rounded-[28px] p-6 md:p-8">
  <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
    <h3 class="text-xl font-bold">{text(related["title"])}</h3>
    {level_badge(related["level"])}
  </div>
  <p class="text-primaryFg/70 flex-grow">{text(related["definition"])}</p>
  <span class="mt-6 font-semibold">Open lesson <span class="inline-block ml-1 transition-transform group-hover:translate-x-1">→</span></span>
</a>""")
    return f"""<!-- Read Next -->
<section class="mb-20 md:mb-28">
  <p class="eyebrow mb-3">Read next</p>
  <h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-8">Related Techniques</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
{indent(chr(10).join(cards), 4)}
  </div>
</section>"""


def lesson_navigation(previous, following):
    def link(lesson, label, align):
        return f"""<a href="{lesson["href"]}" class="glass glass-hover rounded-[28px] p-6 md:p-8{align}">
  <p class="eyebrow mb-2">{label}</p>
  <p class="text-xl font-bold">{html.escape(lesson["title"])}</p>
</a>"""
    back = link(previous, "← Previous lesson", "") if previous else link(
        {"href": "/learn.html", "title": "Learn Sudoku"}, "← All lessons", "")
    forward = link(following, "Next lesson →", " sm:text-right") if following else link(
        {"href": "/learn.html", "title": "Learn Sudoku"}, "All lessons →", " sm:text-right")
    return f'<nav class="grid grid-cols-1 sm:grid-cols-2 gap-5">\n{indent(back, 2)}\n{indent(forward, 2)}\n</nav>'


def technique_page(page, pages, lessons, template):
    first = page["techniques"][0]
    slug = SLUGS[page["id"]]
    examples = {e["technique"]: e for e in page["examples"]}
    title = first["title"][LANGUAGE]

    sections = [f"""<!-- Worked Example -->
<section id="worked-example" class="scroll-mt-28 mb-20 md:mb-28">
{indent(stepper(examples[first["example"]], f"{title} in Action"), 2)}

{indent(spot_and_does(first), 2)}
</section>"""]
    sections += [variant_section(v, page) for v in page["variants"]]
    extras = ROOT / "scripts" / "learn" / "extras" / f"{slug}.html"
    if extras.exists():
        hand_written = extras.read_text().split("\n", 1)[1].rstrip()
        sections.append(hand_written)
    sections.append(related_section(page, pages))

    chips = ""
    if page["variants"]:
        links = [("worked-example", "Worked Example")] + [(variant_id(v), variant_title(v)) for v in page["variants"]]
        chips = "\n".join(
            f'<a href="#{anchor}" class="chip"><span class="chip-num">{n:02d}</span>{html.escape(label)}</a>'
            for n, (anchor, label) in enumerate(links, 1)
        )
        chips = f'      <div class="mt-8 flex flex-wrap gap-2.5">\n{indent(chips, 8)}\n      </div>'

    index = next(i for i, lesson in enumerate(lessons) if lesson["slug"] == slug)
    previous = lessons[index - 1] if index > 0 else None
    following = lessons[index + 1] if index + 1 < len(lessons) else None
    definition = first["definition"][LANGUAGE]
    names = ", ".join(t["title"][LANGUAGE] for t in page["techniques"])

    values = {
        "title": html.escape(title),
        "description": attribute(definition),
        "keywords": attribute(f"{names.lower()}, sudoku techniques, {first['level']['name'].lower()} sudoku"),
        "slug": slug,
        "level": level_badge(first["level"]),
        "lesson": str(index + 1),
        "lessons": str(len(lessons)),
        "definition": text(first["definition"]),
        "chips": chips,
        "sections": indent("\n\n".join(sections), 4),
        "practice": html.escape(
            f"Magic Sudoku's hints teach the {title} the moment it's the next step in your puzzle: "
            "where to look, and why it works."
        ),
        "navigation": indent(lesson_navigation(previous, following), 4),
    }
    out = template
    for key, value in values.items():
        out = out.replace("{{" + key + "}}", value)
    leftover = re.findall(r"\{\{\w+\}\}", out)
    if leftover:
        sys.exit(f"technique.html has placeholders the script doesn't fill: {leftover}")
    return out


# ---------- Regions in hand-written pages ----------

def fill(path, name, content):
    """Replaces what's between <!-- guides:name --> and <!-- /guides:name --> in `path`."""
    source = path.read_text()
    pattern = re.compile(
        r"(?P<open>(?P<indent>[ \t]*)<!-- guides:" + re.escape(name) + r" -->)(?P<body>.*?)(?P<close><!-- /guides:"
        + re.escape(name) + r" -->)",
        re.S,
    )
    match = pattern.search(source)
    if match is None:
        sys.exit(f"{path.relative_to(ROOT)} has no guides:{name} region")
    if "\n" in match["body"]:
        pad = len(match["indent"])
        body = "\n" + indent(content, pad) + "\n" + match["indent"]
    else:
        body = content
    updated = source[: match.start("body")] + body + source[match.end("body"):]
    if updated != source:
        path.write_text(updated)


def rules_steps(rules):
    figures = []
    for number, page in enumerate(rules["howToPlay"], 1):
        attributes = []
        highlight = page["highlight"]
        kind = highlight["kind"]
        if kind in ("row", "column", "house"):
            spec = {"row": "row", "column": "col", "house": "box"}[kind]
            attributes.append(f'data-highlight="{spec}:{highlight["index"] + 1}"')
        elif kind == "square":
            attributes.append(f'data-highlight="cell:{highlight["square"]["row"] + 1},{highlight["square"]["column"] + 1}"')
        elif kind != "none":
            sys.exit(f"How to Play's boards can't draw a {kind} highlight")
        empty = "0" * 81
        if page["givens"] != empty:
            attributes.append(f'data-givens="{page["givens"]}"')
        if page["added"] != empty:
            attributes.append(f'data-added="{page["added"]}"')
        board = '<div class="demo-board"' + "".join("\n  " + a for a in attributes) + "></div>"
        note = page.get("note")
        lines = [f'<p class="text-lg text-primaryFg/80{" mb-3" if note else ""}">{text(page["text"])}</p>']
        if note:
            lines.append(f'<p class="text-primaryFg/60">{text(note)}</p>')
        figures.append(f"""<figure class="stepper-slide md:grid-cols-2 gap-6 md:gap-10 items-center" data-slide>
{indent(board, 2)}
  <figcaption>
    <div class="flex items-center gap-3 mb-4">
      <span class="cell-num cell-num-sm">{number}</span>
      <h4 class="text-xl font-semibold">{text(page["title"])}</h4>
    </div>
{indent(chr(10).join(lines), 4)}
  </figcaption>
</figure>""")
    return "\n\n".join(figures)


def lesson_card(number, lesson):
    return f"""<a href="{lesson["href"]}" class="glass glass-hover group flex flex-col rounded-[28px] p-3">
{indent(lesson["board"], 2)}
  <div class="flex flex-col flex-grow p-4 pt-6">
    <div class="flex items-center justify-between mb-4">
      <span class="cell-num cell-num-sm">{number}</span>
      {level_badge(lesson["level"])}
    </div>
    <h3 class="text-xl font-bold mb-2">{html.escape(lesson["title"])}</h3>
    <p class="text-primaryFg/70 flex-grow">{html.escape(lesson["blurb"])}</p>
    <span class="mt-6 font-semibold">
      {"Start here" if number == 1 else "Open lesson"}
      <span class="inline-block ml-1 transition-transform group-hover:translate-x-1">→</span>
    </span>
  </div>
</a>"""


def lesson_groups(lessons):
    """The lessons as cards, a group for each level, easiest first."""
    groups = []
    for level_id in LEVEL_DOTS:
        members = [(n, lesson) for n, lesson in enumerate(lessons, 1) if lesson["level"]["id"] == level_id]
        if not members:
            continue
        count = f'{len(members)} lesson{"s" if len(members) != 1 else ""}'
        cards = "\n\n".join(lesson_card(n, lesson) for n, lesson in members)
        groups.append(f"""<div>
  <div class="flex items-center gap-3 mb-6">
    {level_badge(members[0][1]["level"])}
    <span class="text-sm text-primaryFg/60">{count}</span>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
{indent(cards, 4)}
  </div>
</div>""")
    return '<div class="flex flex-col gap-14">\n' + indent("\n\n".join(groups), 2) + "\n</div>"


def sitemap_entries(lessons, changed, path):
    """A sitemap entry per technique page: today for a page this run changed, and the date it
    already had otherwise."""
    existing = dict(re.findall(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>", path.read_text()))
    entries = []
    for lesson in lessons[1:]:
        loc = f"https://magic-sudoku.com{lesson['href']}"
        modified = date.today().isoformat() if lesson["slug"] in changed else existing.get(loc, date.today().isoformat())
        entries.append(f"""<url>
  <loc>{loc}</loc>
  <lastmod>{modified}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>""")
    return "\n".join(entries)


def main():
    book = json.loads((ROOT / "data" / "guides.json").read_text())
    if book["schemaVersion"] != 1:
        sys.exit(f"guides.json is schema version {book['schemaVersion']}; this script reads version 1")
    pages = {page["id"]: page for page in book["pages"]}
    unknown = set(pages) - set(SLUGS)
    if unknown:
        sys.exit(f"guides.json has pages with no address in SLUGS: {sorted(unknown)}")

    how_to_play_board = (
        '<div class="demo-board"\n'
        '  data-givens="009010030050009000000004020901000702030000100280060000020300609000090000000157004"\n'
        '  data-highlight="row:5"></div>'
    )
    lessons = [dict(HOW_TO_PLAY, href="/learn/how-to-play.html", board=how_to_play_board)]
    for page in book["pages"]:
        first = page["techniques"][0]
        example = next(e for e in page["examples"] if e["technique"] == first["example"])
        lessons.append({
            "slug": SLUGS[page["id"]],
            "href": f"/learn/{SLUGS[page['id']]}.html",
            "title": first["title"][LANGUAGE],
            "level": first["level"],
            "blurb": first["definition"][LANGUAGE],
            "board": guide_board(example, example["frames"][0]),
        })

    template = (ROOT / "scripts" / "learn" / "technique.html").read_text()
    changed = set()
    for page in book["pages"]:
        out = ROOT / "learn" / f"{SLUGS[page['id']]}.html"
        built = technique_page(page, pages, lessons, template)
        if out.exists() == False or out.read_text() != built:
            out.write_text(built)
            changed.add(SLUGS[page["id"]])

    how_to_play = ROOT / "learn" / "how-to-play.html"
    fill(how_to_play, "rules", rules_steps(book["rules"]))
    fill(how_to_play, "lesson", f"Lesson 1 of {len(lessons)}")
    fill(how_to_play, "navigation", lesson_navigation(None, lessons[1]))
    fill(ROOT / "learn.html", "lessons", lesson_groups(lessons))
    sitemap = ROOT / "sitemap.xml"
    fill(sitemap, "lessons", sitemap_entries(lessons, changed, sitemap))
    print(f"Built {len(book['pages'])} technique pages and How to Play's {len(book['rules']['howToPlay'])} rules steps.")


if __name__ == "__main__":
    main()
