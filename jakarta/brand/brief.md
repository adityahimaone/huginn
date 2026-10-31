# Jakarta — brief

Six lines. If the rejection sentence needs a comma splice, the idea is not ready.

| | |
| --- | --- |
| **Name** | Jakarta — *Kota Kolaborasi* / City of Collaboration |
| **Category** | City identity and civic design system |
| **Audience** | 10,6 million residents · 5,3 million daily commuters · 44 *kecamatan* offices · several hundred vendors who will build things without asking |
| **Promise** | One voice for a city assembled from districts, without flattening any of them |
| **Enemy** | The template — the Monas silhouette, the blue-green gradient, the stock family photograph, identical in 514 *kabupaten* and *kota* |
| **Rejection test** | If the mark could belong to any city with a monument, it is not Jakarta's. |

## The argument

Jakarta is not a city with a centre. It is a set of centres that learned to share a
horizon — the port, the palace, the market, the tower, the terminal. Any identity that
begins with a monument begins by choosing one of them.

This one begins at the junction: the place where a route turns and a stop is made.
That is the only shape all forty-four districts have in common, and it is the only
shape that survives being printed at 24mm on a bus panel and at 24px in a status bar.

Since the seat of national government moved to Nusantara, the city's argument is no
longer *we are the centre of the country*. It is *we are where everything meets*.
That is a harder argument to draw, and a better one.

## Five beats

**Belief.** A city is an agreement, not a skyline. Jakarta works because ten million
people negotiate it every morning. The identity should look like that negotiation,
not like its result.

**Enemy.** The template. Not because it is ugly — because it is an argument that
nowhere is anywhere.

**Mark.** One line turns, one stop is made. The stroke is one width throughout. The
stop is larger than the line, because a stop is not a smaller thing than a route: it
is where the route becomes useful. There is no landmark in it. A monument would have
been a picture of one district standing for forty-four.

**Material.** Enamel sign panel, printed vinyl on a Mikrotrans, powder-coated steel,
a matte card in a pocket. Every decision here is tested against a surface that will
be rained on.

**Proof / Gap.** 0,989 IoU between the redrawn mark and the supplied bitmap; 14
contrast pairs computed per scope; six district colours published as failing 4,5:1.
The gap: no citizen has seen any of it, and nothing has been printed.

## Decisions, and what each one costs

**01 · The palette is a map, not a mood.**
*Because* the nine ramps already carry Jakarta place names. *Not when* a campaign
needs a colour that means nothing — then it borrows a district and says which.
*Breaks next* if someone adds a tenth colour without a place to name it after.

**02 · One stroke, everywhere.**
*Because* a single measure is what makes a system legible at 16px and at eight metres.
*Not when* the medium is a 390px screen — then the compact drawing is used, not a
thinner stroke. *Breaks next* if a weight is invented for “emphasis”.

**03 · No gradients, no shadows on type.**
*Because* the system is printed on vinyl that fades and shown on screens that are
dimmed outdoors. *Not when* a photograph needs a scrim — that is a photograph, not a
brand element. *Breaks next* the first time someone adds “depth” to a card.

**04 · District colours are grounds, not inks.**
*Because* six of the nine measure under 4,5:1 on paper, and two measure under 2:1.
*Not when* the type is 24px or larger, where 3:1 applies and they pass. *Breaks next*
if a slide deck sets 14px body copy in Kebayoran yellow.

**05 · The wordmark is a drawing.**
*Because* a font failure must not change the city's name. *Not when* the name appears
below 40px — then the reading face carries it. *Breaks next* if someone “fixes” the
tracking in Figma instead of in `outline-wordmark.py`.

**06 · Night is a scope, not a palette.**
*Because* a second palette drifts within a month. *Not when* a surface needs a colour
the semantics do not have — then the semantic layer is wrong, not the scope.
*Breaks next* the first mode-prefixed primitive (`--jk-night-ground`).
