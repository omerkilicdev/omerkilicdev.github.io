# Editing the site

Plain HTML and CSS, no build step. Layout follows the al-folio academic format:
fixed nav, portrait, bio, availability banner, icon row, `news` table, `selected work` list.

## Portrait

Drop a square photo at `media/portrait.jpg` (800x800 is plenty). Without one the whole
block removes itself and the page still works.

## A news row

In the `news` table, newest first:

```html
<tr>
  <th scope="row">Oct 2026</th>
  <td>What happened. Keep it to one or two lines.
    <ul><li>optional sub-point</li></ul>
  </td>
</tr>
```

## A work entry

Copy one `<li>` inside `<ol class="work">`. Two to four badges, an optional preview image,
and optional link buttons.

```html
<li>
  <div class="aside">
    <span class="badge">CFD</span>
    <span class="badge">6-DOF</span>
    <img class="preview" src="media/tusas/store-sep.webp" alt="" width="1600" height="1000" loading="lazy" decoding="async">
  </div>
  <div>
    <div class="title">Title of the piece of work</div>
    <div class="where">Organisation, group</div>
    <div class="when">Aug &ndash; Sep 2026</div>
    <p class="blurb">Two or three sentences. What you did, what came out of it, a number if there is one.</p>
    <div class="links">
      <a href="docs/tusas/report.pdf" target="_blank" rel="noopener">report</a>
      <a href="https://example.com" target="_blank" rel="noopener">code</a>
    </div>
  </div>
</li>
```

## Files

```
media/<key>/   images      .svg for plots, .webp for photographs and video posters
               video       .mp4 (H.264, yuv420p) with a .webp poster frame
docs/<key>/    documents   .pdf
```

A looping video inside a work entry goes in the `showcase` block: `autoplay muted loop
playsinline` plus a `poster`, and the reduced-motion script at the bottom of `index.html`
turns autoplay off for users who ask for less motion. A long video uses
`controls preload="none"` with a poster so nothing downloads until it is played.

Keys in use: `research`, `tusas`, `njit`, `ev`. Add folders as needed.

`width` and `height` on the image are the real pixel dimensions; without them the page
reflows while images load. Get them with `sips -g pixelWidth -g pixelHeight <file>`.
Previews render inside a 16:10 plate with a light ground, so plots authored on white stay
readable in dark mode.

## Before adding anything: the disclosure check

This site is public and permanently indexed.

1. **Unpublished research?** Convergence studies, moment-closure results, wake diagnostics
   and anything from the frontier branch do not go up before the preprints. Material already
   published on the group hub is fine.
2. **Someone else's to release?** Internship material (Turkish Aerospace, NJIT) belongs to the
   host organisation. Put up only what is cleared or clearly generic; otherwise describe it in
   words and show no figure.
3. **Third-party faces, names, contact details, client addresses?** Needs permission, and no
   visible address.
4. **Recommendation, reference or petition letters?** Never. They stay private.
5. **Credentials, internal URLs, export-controlled detail?** Never, in any form.

Failing any of these does not mean the work is not worth mentioning; it means the figure does
not go on the open web.
