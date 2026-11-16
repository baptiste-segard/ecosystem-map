# Ecosystem Map — static site (working prototype)

Deploy: copy this folder as-is to any web server (no build, no backend, no external requests except Google Fonts).

```
index.html        the whole app (markup, styles, script, embedded data)
vendor/d3.min.js  D3 v7.9.0, served locally
logos/<id>.webp   one square logo per organisation (152 of 155)
data/             the same dataset as CSV / JSON, for maintenance
favicon.svg       placeholder mark (no branding decided yet)
```

Data: GRLI "All of us" Ecosystem Map (Airtable), 155 organisations read on 22 Oct 2026.
Added for the prototype: head-office location (city/country/lat/lng, `geo_confidence` H/M/L — 51 to verify),
`scope`, `region`, `logo` (Airtable attachment, or website favicon for 11 of them).
Events: the two regional meetings are real; the others are marked "sample".

To update the data: edit `data/ecosystem.json`, then replace the JSON inside `<script id="data">` in index.html
(or rebuild with build.py from the source project).

`<meta name="robots" content="noindex">` is set: remove it when the site goes public.
