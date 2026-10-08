# When Iron Runs Low · PBL Group B-1

An interactive, web-based presentation for **PBL Group B-1 (MD 2, 2026–2027), under Dr. Waqas Hameed**.
It follows one patient, a case of iron-deficiency anemia from heavy menstrual bleeding, through six learning objectives:

| # | SLO | Live visuals |
|---|-----|--------------|
| B-1.1 | Structure of red bone marrow | Hematopoiesis tree, **3D marrow** (sinusoids, reticular fibers, erythroblastic island, megakaryocyte), red vs yellow marrow skeleton |
| B-1.2 | Histology of liver and spleen | **3D hepatic lobule** with blood/bile flow, spleen section (capsule, trabeculae, white and red pulp) |
| B-1.3 | Liver and spleen in iron and RBC recycling | 3 µm splenic slit test, macrophage with hepcidin switch, bilirubin pathway, iron "leak" loop |
| B-1.4 | RBC synthesis and breakdown; anemia and polycythemia | Erythropoiesis with iron switch, EPO loop, 120-day scrubber, **3D anemia morphology**, RBC-count chart, viscosity simulator |
| B-1.5 | Hb, Hct, MCV, MCH, MCHC, RDW, RBC count | Hematocrit tubes, indices comparison, RDW blood films, patient CBC dashboard |
| B-1.6 | Biochemistry of microcytic anemia | Iron absorption with hepcidin, body-iron donut, heme synthesis with iron switch, **3D hemoglobin + O₂**, iron studies, causal chain |

## Presenting

Open the published page in Chrome, Edge or Safari and press **F** for full screen.

| Key | Action |
| --- | --- |
| `H` | **Hub**: the six points, ready for whichever student is called |
| `Shift` + `1`…`6` | Open point 1–6 directly |
| `→` `Space` `PgDn` (clicker) | Next build step / slide |
| `←` `PgUp` | Previous |
| `Shift` + `→` | Skip to the next slide |
| `S` | Presenter view in a new window: notes, timer, next slide, all synced |
| `O` | Overview of all slides (useful for questions) |
| `T` | Light / dark mode (light helps in bright rooms or weak projectors) |
| `B` or `.` | Black screen |
| `12` then `Enter` | Jump to slide 12 |
| `?` | Shortcut help |

### Random-student format

The judges pick students at random to present one of the six points. The deck is built for that:

1. Show the case, then the **hub** (slide 3).
2. Click the point the student was given. Each point is self-contained: title slide → visuals → **key-points** slide with the link to our patient.
3. Press **← All six points** (or `H`) to return. Presented points get a ✓, and the small `⌂ 1–6` buttons at the bottom-right jump anywhere.

Slides carry only headings and short bullets. The full explanations are in the speaker notes (press `S`).

Interactive elements (switches, the 3D models, the 120-day slider, the anemia list) can be clicked or dragged at any time. Each switch also advances automatically with the build steps, so you can present with a clicker alone.

The deck is laid out on a 1920×1080 canvas and scales to any screen. Type is sized to be read from the back of a hall.

## Running offline (if venue Wi-Fi fails)

Everything (fonts, Three.js) is bundled; nothing loads from the internet. Browsers block ES modules from `file://`, so serve the folder locally:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
# or
npx serve .
```

## Sources

The four references cited in the group's research document, plus sources used to verify details (hepcidin–ferroportin, iron absorption, heme synthesis, bilirubin, liver histology), are listed on the **Sources** slide. Numbers shown on slides (cell dimensions, iron distribution, viscosity, red-cell counts, O₂ capacity) come from Guyton & Hall, Ch. 33, and each slide names its source.

## Tech

Plain HTML/CSS/JS, no build step. [Three.js](https://threejs.org) r170 (MIT) for 3D, [Inter](https://rsms.me/inter/) (OFL) for type. GitHub Pages deploys through `.github/workflows/pages.yml`.
