# nCoVis Choropleth

### About

[Demo here](https://ncovis.github.io/choropleth/).

This project was initiated in January 2020. Compared with other existing visualizations of COVID-19 during that time, nCoVis Choropleth collects and visualizes data at the granularity of prefecture-level cities instead of provinces. It also includes several derivative indicators such as infection density (infections per km²) and infection ratio (%) for the first time.

From July 17 2020, nCoVis will be visualizing global data instead. You can still access the legacy version (the Chinese prefecture-level cities map) through the link provided in the page.

![Preview](https://i.imgur.com/n9hVX6a.jpg "Preview")

*China View (2,3) and World View (1,4)*

### Contributing

This repo looks like a mess, because some random bugs in ParcelJS made ugly workarounds for branch and file structures inevitable. You wouldn't want to do that. 🤦

### Start Building

```sh
# Development

npm i
npm install -g parcel-bundler # if you haven't installed it yet
parcel index.html

# Production Build & Deployment

parcel build index.html --public-url "."
# For publishing on github pages, relative path configuration is required.
git subtree push --prefix dist origin gh-pages
```
