# Adding material to an experience

Nothing here needs a build step. Two moves per item.

## 1. Put the file in the right folder

```
media/<key>/     images and figures   (.svg preferred, then .webp/.avif, then .png/.jpg)
docs/<key>/      documents            (.pdf)
```

`<key>` is one of:

| key | entry on the page |
|---|---|
| `research`   | Aresty Research Assistant, Rutgers MAE |
| `tusas`      | Engineering Intern, Turkish Aerospace |
| `njit`       | Research Intern, NJIT Gor Laboratory |
| `hitech`     | Hi Tech Electrical Contractors |
| `ev`         | Electric Vehicle Conversion |
| `service`    | Environmental Service Volunteer |
| `propulsion` | Rutgers Propulsion Lab |

## 2. Add one line to the registry

The registry is the `<script type="application/json" id="artifact-data">` block near the
bottom of `index.html`. Order inside a key is the order shown on the page.

Image:

```json
{ "type": "image", "src": "media/tusas/store-separation.png", "w": 1600, "h": 1000,
  "alt": "Store trajectory downstream of the aircraft at three release conditions.",
  "caption": "Six-degree-of-freedom store-separation trajectories, three release conditions." }
```

`w` and `h` are the real pixel dimensions. They are required: without them the page
reflows while images load. Get them with `sips -g pixelWidth -g pixelHeight <file>`.

Document:

```json
{ "type": "doc", "href": "docs/tusas/rotor-balancing-report.pdf",
  "kind": "PDF", "title": "T129 main-rotor blade manufacturing and balancing",
  "note": "Report · 14 pp" }
```

An entry with an empty array renders nothing, no empty heading, no gap.

## Image preparation

- Never ship a source image far larger than it is displayed. Figures render at about
  700 px wide at most; 1600 px is a generous retina source.
- Vector figures stay `.svg`. Plots from matplotlib should be saved as `.svg`.
- Photographs: convert to `.webp` at quality 82.
  `cwebp -q 82 in.png -o out.webp`, or `sips -s format jpeg -s formatOptions 82`.
- Strip camera metadata from photographs before committing.

## Before adding anything: the disclosure check

This site is public and permanently indexed. Run every item past these questions.

1. **Is it unpublished research?** Convergence studies, the moment-closure results, the
   wake diagnostics, anything from the frontier branch: these do not go on a public page
   before the preprints are out. Published hub material and seminar figures are fine.
2. **Is it someone else's to release?** Internship material (Turkish Aerospace, NJIT) is
   the host organisation's. Only put up what is already cleared or clearly generic.
   When in doubt, describe the work in words and show no figure.
3. **Does it contain third-party faces, names, contact details, or client addresses?**
   Contracting photographs need the client's permission and no visible address.
4. **Does it contain a credential, an internal URL, or an export-controlled detail?**
   If yes it does not go up, in any form.

If an item fails any of these, it still belongs in the CV conversation; it just does not
belong on the open web.
