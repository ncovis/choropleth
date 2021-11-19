import fetchJsonp from "fetch-jsonp";
import chroma from "chroma-js";

let china = require("./../data/china-proj.topo.json");
let topoData = topojson.feature(china, china.objects.provinces).features;
let censUrl = require("./../data/2010-census.csv");
const DIM_COLOR = "#222"

console.log("Geographical Data", topoData);

let data = {};
let maxInfection = 0;
let path = d3.geoPath();

const altSubstr = str => {
  if (str.substr(0, 2) == "张家") return str.substr(0, 3);
  if (str.substr(0, 3) == "公主岭") return "四平";
  if (str.substr(0, 2) == "巴州") return "巴音";
  if (str.substr(0, 2) == "克州") return "克孜";
  return str.substr(0, 2);
};

const setOpacity = (hex, alpha) => {
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
};

const deNaN = orig => {
  if (orig === 'NaN' || isNaN(orig)) return "N/A"
  return orig
}

document.body.addEventListener("mousemove", e => {
  d3.select("html").style("background-position-x", +e.offsetX / 10.0 + "px");
  d3.select("html").style("background-position-y", +e.offsetY / 10.0 + "px");
});

fetchJsonp("https://interface.sina.cn/news/wap/fymap2020_data.d.json")
  .then(function (response) {
    return response.json();
  })
  .then(function (raw) {
    console.log("Infection Data from Sina", raw);
    raw.data.list.forEach(prov => {
      let special = {
        北京: 0,
        天津: 0,
        重庆: 0,
        上海: 0,
        台湾: 1,
        香港: 1,
        澳门: 1
      };
      if (prov.name == "西藏" && prov.city.length <= 1) {
        // Representing that Sina has not changed Tibet to city-scale data yet
        data["拉萨"] = {
          conNum: prov.value,
          deathNum: prov.deathNum,
          cureNum: prov.cureNum,
          used: false
        };
      }
      if (prov.name in special) {
        data[prov.name] = {
          conNum: prov.value,
          deathNum: prov.deathNum,
          cureNum: prov.cureNum,
          used: false
        };
      } else {
        prov.city.forEach(city => {
          let name = city.name;
          data[altSubstr(name)] = {
            conNum: city.conNum,
            deathNum: city.deathNum,
            cureNum: city.cureNum,
            used: false
          };
          if (city.conNum > maxInfection) maxInfection = city.conNum;
        });
      }
    });
    fetch(censUrl)
      .then(res => res.text())
      .then(cens => {
        const render = method => {
          d3.select("svg-frame").html("");
          let { formula, dataDefault, style, properties } = method;

          const resetRegion = () => {
            d3.select(".rate").html(
              dataDefault.toFixed(method.properties.toFixed)
            );
            d3.select(".city-name").html("China / 全国");
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
            .attr("viewBox", [0, 0, 875, 910])

          const g = svg.append("g")

          g.attr("id", "geo-paths")
            .selectAll("path")
            .data(topoData)
            .join("path")
            .attr("class", "clickable")
            .attr("fill", d => {
              let cut = altSubstr(d.properties.NAME);
              if (cut in data) {
                data[cut].used = true;
                console.log(style.paint(formula(cut, d.properties)))
                return style.paint(formula(cut, d.properties)) || DIM_COLOR;
              }
              return DIM_COLOR;
            })
            .attr("d", path)
            .on("mouseover", d => {
              let cut = altSubstr(d.properties.NAME);
              d3.select(".city-name").text(d.properties.NAME);
              if (cut in data) {
                d3.select(".rate").text(
                  deNaN(formula(cut, d.properties).toFixed(method.properties.toFixed))
                );
              } else {
                d3.select(".rate").text(0);
              }
            })
            .on("click", d => {
              let cut = altSubstr(d.properties.NAME);
              if (cut in data) {
                let c = style.paint(formula(cut, d.properties));
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
            });

          const zoom = d3.zoom().scaleExtent([0.5, 8]).on('zoom', () => {
            g.attr('transform', d3.event.transform);
          });
          svg.call(zoom)

          for (let city in data) {
            if (!data[city].used) console.warn("Unused city", city);
          }
        };

        let population = new Map(
          d3.csvParse(cens, ({ city, population }) => [
            altSubstr(city),
            population
          ])
        );
        console.log("Population Data from Census 2010", population);

        let methods = {
          ratio: {
            formula: (cut, dProp) => data[cut].conNum / population.get(cut),
            dataDefault: +raw.data.gntotal / 138000,
            style: {
              paint: value => {
                if (value === 0) return DIM_COLOR
                return d3
                  .scalePow()
                  .interpolate(() => d3.interpolateInferno)
                  .exponent(0.2)
                  .domain([0, 60])(value)
              },
              interpolation: d3.interpolateInferno
            },
            properties: {
              title: "Infection Ratio",
              abbv: "感染比例 Ratio",
              desc: "Infections per 10,000 People / 每万人感染数",
              toFixed: 4
            }
          },
          density: {
            formula: (cut, dProp) => data[cut].conNum / dProp.Shape_Area,
            dataDefault: +raw.data.gntotal / 960,
            style: {
              paint: value => {
                if (value === 0) return DIM_COLOR
                return d3
                  .scalePow()
                  .interpolate(() => d3.interpolateViridis)
                  .exponent(0.3)
                  .domain([0, 6500])(value)
              },
              interpolation: d3.interpolateViridis
            },
            properties: {
              title: "Infection Density",
              abbv: "感染密度 Density",
              desc: "Infections per 10,000 km² / 每万 km² 感染数",
              toFixed: 2
            }
          },
          absolute: {
            formula: (cut, dProp) => +data[cut].conNum,
            dataDefault: +raw.data.gntotal,
            style: {
              paint: value => {
                if (value === 0) return DIM_COLOR
                return d3
                  .scalePow()
                  .interpolate(() => d3.interpolateCividis)
                  .exponent(0.3)
                  .domain([0, 6500])(value)
              },
              interpolation: d3.interpolateCividis
            },
            properties: {
              title: "Total Infections",
              abbv: "感染人数 Absolute",
              desc: "Number of Infected People / 感染人数",
              toFixed: 0
            }
          },
          cures: {
            formula: (cut, dProp) => +data[cut].cureNum / data[cut].conNum,
            dataDefault: +raw.data.curetotal / raw.data.gntotal,
            style: {
              paint: d3
                .scalePow()
                .interpolate(() => d3.interpolateGreens)
                .exponent(1.5)
                .domain([0, 1.1]),
              interpolation: d3.interpolateGreens
            },
            properties: {
              title: "Cure Rate",
              abbv: "治愈率 Cure",
              desc: "Cures to Confirmed Infections / 治愈占确诊人数比例",
              toFixed: 3
            }
          },
          deaths: {
            formula: (cut, dProp) => +data[cut].deathNum / data[cut].conNum,
            dataDefault: +raw.data.deathtotal / raw.data.gntotal,
            style: {
              paint: d3
                .scalePow()
                .interpolate(() => d3.interpolateGreys)
                .exponent(0.3)
                .domain([0, 2]),
              interpolation: d3.interpolateGreys
            },
            properties: {
              title: "Mortality Rate",
              abbv: "死亡率 Mortality",
              desc: "Deaths to Confirmed Infections / 死亡占确诊人数比例",
              toFixed: 3
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
        document.querySelector('label[for="ratio"]').click();
      });
  })
  .catch(function (ex) {
    console.log("parsing failed", ex);
  });
