# nCoVis Choropleth

### About

Visualization of the Novel Coronavirus outbreak in Wuhan, China. [Demo here](https://ncovis.github.io/choropleth/).

Compared with other existing visualization projects for nCoV-2019, nCoVis Choropleth collects and visualizes data of prefecture-level cities (instead of provinces), as well as other indicators such as infection density (infections per km²) and infection ratio (%).

From July 17 2020, the project will be visualizing global data instead. You can still access the legacy verion (the Chinese prefecture-level cities map) through the link provided in the page.

![Preview](https://i.imgur.com/n9hVX6a.jpg "Preview")

*China View (2,3) and World View (1,4)*

### Contributing

This repo looks like a mess, because some random bugs in ParcelJS made ugly workarounds for branch and file structrues inevitable. You wouldn't want to do that. 🤦

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
