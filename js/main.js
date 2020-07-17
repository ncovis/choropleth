import fetchJsonp from "fetch-jsonp"
import chroma from "chroma-js"
import swal from 'sweetalert'

let world = require("./../data/countries-50m.json")
let topoData = topojson.feature(world, world.objects.countries).features
let translationUrl = require("./../data/world-translate.csv")
let populationUrl = require("./../data/population-wb.csv")
let cachedRawUrl = require("./../data/infection.txt")

console.log("Geographical Data", topoData)

let data = {}
let path = d3.geoPath(d3.geoNaturalEarth1())
let processRaw = raw => {
  console.log("Infection Data from Sina", raw);
  raw.data.worldlist.forEach(country => {
    data[country.name] = country;
    data[country.name].computed = {};
    if (country.name === "中国")
      data[country.name].conNum = data[country.name].value;
  });
  fetch(translationUrl)
    .then(res => res.text())
    .then(translations => {
      fetch(populationUrl)
        .then(res => res.text())
        .then(population => {
          let translationMap = new Map(
            d3.csvParse(translations, ({ en, zh }) => [en, zh])
          );

          let populationMap = new Map(
            d3.csvParse(population, ({ country, population }) => [
              country,
              population
            ])
          );

          const zoom = d3.zoom().scaleExtent([0.5, 8])

          const render = method => {
            d3.select("svg-frame").html("");
            d3.select("body").style(
              "background-color",
              ""
            );

            let { formula, dataDefault, style, properties } = method
            let formulaR = d => {
              if (isNaN(formula(d))) {
                console.warn("Invalid result for " + d.name)
                return 0
              }
              else return formula(d)
            }

            const resetRegion = () => {
              d3.select(".rate").html(
                dataDefault.toFixed(method.properties.toFixed)
              );
              d3.select(".city-name").html("World / 全球");
              d3.select(".grad-bar").style(
                "background",
                `linear-gradient(to right,${style.interpolation(
                  0.2
                )},${style.interpolation(0.5)},${style.interpolation(0.9)})`
              );
            };
            resetRegion();

            d3.select(".title .light").text(properties.title);
            d3.select(".desc").text(properties.desc);

            const svg = d3.select("svg-frame")
              .append("svg")
              .attr("viewBox", [170, -70, 630, 550]) // Global
              // .attr("viewBox", [200, 0, 500, 300]) // Atlantic

            const g = svg.append("g")

            g.attr("id", "geo-paths")
              .selectAll("path")
              .data(topoData)
              .join("path")
              .attr("class", "clickable")
              .attr("fill", d => {
                let nameCN = translationMap.get(d.properties.name);
                if (nameCN in data) {
                  data[nameCN].used = true;
                  data[nameCN]["computed"][method.properties.abbv] = formulaR(
                    d.properties
                  );
                  return style.paint(formulaR(d.properties));
                }
                return "#222";
              })
              .attr("d", path)
              .on("mouseover", d => {
                let nameCN = translationMap.get(d.properties.name);
                d3.select(".city-name").text(d.properties.name);
                if (nameCN in data) {
                  d3.select(".rate").text(
                    formulaR(d.properties).toFixed(method.properties.toFixed)
                  );
                } else {
                  d3.select(".rate").text(0);
                }
              })
              .on("click", d => {
                let nameCN = translationMap.get(d.properties.name);
                if (nameCN in data) {
                  let c = style.paint(formulaR(d.properties));
                  d3.select("body").style(
                    "background-color",
                    chroma(c).alpha(0.75)
                  );
                } else {
                  d3.select("body").style("background-color", "");
                }
              })
              .on("mouseout", d => {
                resetRegion();
              })

            zoom.on('zoom', () => {
              g.attr('transform', d3.event.transform);
            });

            svg.call(zoom)

            for (let country in data) {
              if (!data[country].used)
                console.warn("Unused country", country);
            }
          };

          let methods = {
            confirmed: {
              formula: dProp =>
                Number(data[translationMap.get(dProp.name)].conNum),
              dataDefault: Number(raw.data.othertotal.certain),
              style: {
                paint: d3
                  .scalePow()
                  .interpolate(() => d3.interpolateCividis)
                  .exponent(0.3)
                  .domain([-1000, 3000000]),
                interpolation: d3.interpolateCividis
              },
              properties: {
                title: "Confirmed",
                abbv: "confirmed",
                desc: "Number of total infected people",
                toFixed: 0
              }
            },
            rConfirmed: {
              formula: dProp => {
                let res =
                  (Number(data[translationMap.get(dProp.name)].conNum) *
                    10000) /
                  populationMap.get(dProp.name);
                if (isNaN(res))
                  console.warn("Missing population data", dProp.name);
                return res;
              },
              dataDefault: Number(raw.data.othertotal.certain) / 770000,
              style: {
                paint: d3
                  .scalePow()
                  .interpolate(() => d3.interpolateInferno)
                  .exponent(0.5)
                  .domain([-5, 150]),
                interpolation: d3.interpolateInferno
              },
              properties: {
                title: "Confirmed Ratio",
                abbv: "r-confirmed",
                desc: "Confirmed infections every 10,000 people",
                toFixed: 4
              }
            },
            existing: {
              formula: dProp =>
                Number(data[translationMap.get(dProp.name)].conNum) -
                Number(data[translationMap.get(dProp.name)].cureNum) -
                Number(data[translationMap.get(dProp.name)].deathNum),
              dataDefault:
                Number(raw.data.othertotal.certain) -
                Number(raw.data.othertotal.die) -
                Number(raw.data.othertotal.recure),
              style: {
                paint: d3
                  .scalePow()
                  .interpolate(() => d3.interpolateCividis)
                  .exponent(0.4)
                  .domain([-1000, 800000]),
                interpolation: d3.interpolateCividis
              },
              properties: {
                title: "Existing Confirmed",
                abbv: "existing",
                desc: "Number of existing infected people",
                toFixed: 0
              }
            },
            rExisting: {
              formula: dProp => {
                let existing =
                  Number(data[translationMap.get(dProp.name)].conNum) -
                  Number(data[translationMap.get(dProp.name)].cureNum) -
                  Number(data[translationMap.get(dProp.name)].deathNum);
                let res = (existing * 10000) / populationMap.get(dProp.name);
                return res;
              },
              dataDefault:
                (Number(raw.data.othertotal.certain) -
                  Number(raw.data.othertotal.die) -
                  Number(raw.data.othertotal.recure)) /
                770000,
              style: {
                paint: d3
                  .scalePow()
                  .interpolate(() => d3.interpolateViridis)
                  .exponent(0.3)
                  .domain([-0.3, 55]),
                interpolation: d3.interpolateViridis
              },
              properties: {
                title: "Existing Ratio",
                abbv: "r-existing",
                desc: "Existing confirmed infections every 10,000 people",
                toFixed: 4
              }
            },
            rDeath: {
              formula: dProp => {
                let existing = Number(
                  data[translationMap.get(dProp.name)].deathNum
                );
                let res = (existing * 10000) / populationMap.get(dProp.name);
                return res;
              },
              dataDefault: Number(raw.data.othertotal.die) / 770000,
              style: {
                paint: d3
                  .scalePow()
                  .interpolate(() => d3.interpolateReds)
                  .exponent(0.3)
                  .domain([-0.01, 10]),
                interpolation: d3.interpolateReds
              },
              properties: {
                title: "Motality Rate",
                abbv: "r-death",
                desc: "Deaths every 10,000 people",
                toFixed: 4
              }
            },
            deathToConfirmed: {
              formula: dProp => {
                let existing = Number(
                  data[translationMap.get(dProp.name)].deathNum /
                    Number(data[translationMap.get(dProp.name)].conNum)
                );
                let res = existing;
                return res;
              },
              dataDefault: Number(raw.data.othertotal.die) / 770000,
              style: {
                paint: d3
                  .scalePow()
                  .interpolate(() => d3.interpolateReds)
                  .exponent(0.4)
                  .domain([-0.01, 0.5]),
                interpolation: d3.interpolateReds
              },
              properties: {
                title: "Death to Confirmed",
                abbv: "death-to-confirmed",
                desc: "Deaths / Confirmed Cases",
                toFixed: 4
              }
            }
          };

          for (let method in methods) {
            d3.select(".methods")
              .append("input")
              .attr("type", "radio")
              .attr("name", "method-ratio")
              .attr("id", method)
              .on("click", () => render(methods[method]));

            d3.select(".methods")
              .append("label")
              .attr("for", method)
              .attr("class", "clickable")
              .text(methods[method].properties.abbv);
          }

          // Fire the first render
          document.querySelector('label[for="rExisting"]').click();

          function sortObject(obj) {
            var arr = [];
            for (var prop in obj) {
              if (
                obj.hasOwnProperty(prop) &&
                obj[prop].computed["r-existing"] !== undefined
              ) {
                arr.push({
                  key: prop,
                  value: obj[prop].computed["r-existing"]
                });
              }
            }
            arr.sort(function(a, b) {
              return a.value - b.value;
            });
            return arr;
          }

          console.log(sortObject(data));
        });
    });
}

document.body.addEventListener("mousemove", e => {
  d3.select("html").style("background-position-x", +e.offsetX / 10.0 + "px")
  d3.select("html").style("background-position-y", +e.offsetY / 10.0 + "px")
})

fetchJsonp("https://interface.sina.cn/news/wap/fymap2020_data.d.jsodn")
  .then(function(response) {
    return response.json();
  })
  .then(processRaw)
  .catch(function(ex) {
    console.log("parsing failed", ex);
    swal({
      title: "💤 Hmmm...",
      text: `The infection data failed to load successfully. This may be because the resource path or format that this webpage depends on has changed. We'll show the newest cached data instead.`,
      button: "Not again... 🤦"
    })
    fetch(cachedRawUrl)
    .then(res => res.json())
    .then(processRaw)
  });
