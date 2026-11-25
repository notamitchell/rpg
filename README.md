# To the Cyclorama

https://notamitchell.github.io/rpg/

Website for *To the Cyclorama* (Melbourne, 1926), a Basic Roleplaying horror adventure by Mitchell Harrop, Eric Jong and Alex Shermon.

Plain static HTML, CSS and JavaScript for GitHub Pages: no build step.

- `index.html`: the page
- `assets/css/site.css`, `assets/js/site.js`: styles and the hero, stereoscope and Triscenorama effects
- `assets/img/`: images (historical images courtesy of State Library Victoria and Museums Victoria)
- `assets/fonts/`: self-hosted Cinzel and Crimson Text (SIL Open Font License)

## The PDFs

The download buttons link to the latest GitHub Release, so they always serve its newest files:

- `https://github.com/notamitchell/rpg/releases/latest/download/to-the-cyclorama-colour.pdf`
- `https://github.com/notamitchell/rpg/releases/latest/download/to-the-cyclorama-bw.pdf`

To publish new versions of the PDFs, create a new release (Releases → Draft a new release) and attach both files with exactly those names.

## Download counts

GitHub counts every download of a release file. No sign-in needed: open
https://api.github.com/repos/notamitchell/rpg/releases
in a browser and look for `"name"` and `"download_count"` under each release's `assets`.

Or, from a terminal, a per-file total across all releases:

```sh
curl -s https://api.github.com/repos/notamitchell/rpg/releases \
  | jq -r '[.[].assets[]] | group_by(.name)[] | "\(map(.download_count) | add)  \(.[0].name)"'
```

With the GitHub CLI: `gh release view --repo notamitchell/rpg --json assets --jq '.assets[] | "\(.downloadCount)  \(.name)"'` (latest release only).

Counts include every download, including bots and repeat downloads, so treat them as a rough measure.

## Publishing the site

To publish: Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
