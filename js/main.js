import fetchJsonp from 'fetch-jsonp'

let china = require('./../data/china-proj.topo.json')
let topoData = topojson.feature(china, china.objects.provinces).features
let censUrl = require('./../data/2010-census.csv')

console.log("Geographical Data", topoData)

let data = {}
let maxInfection = 0
let path = d3.geoPath()

const altSubstr = str => {
    if (str.substr(0, 2) == '张家') return str.substr(0, 3)
    if (str.substr(0, 3) == '公主岭') return "四平"
    if (str.substr(0, 2) == '第七') return "克拉"
    if (str.substr(0, 2) == '第八') return "石河"
    return str.substr(0, 2)
}

fetchJsonp('https://interface.sina.cn/news/wap/fymap2020_data.d.json')

    .then(function (response) {
        return response.json()
    }).then(function (raw) {
        console.log("Infection Data from Sina", raw)
        raw.data.list.forEach(prov => {
            let special = { "北京": 0, "天津": 0, "重庆": 0, "上海": 0, "台湾": 1, "香港": 1, "澳门": 1 }
            if (prov.name == '西藏' && prov.city.length <= 1) { // Representing that Sina has not changed Tibet to city-scale data yet
                data['拉萨'] = {
                    conNum: prov.value,
                    used: false
                }
            }
            if (prov.name in special) {
                data[prov.name] = {
                    conNum: prov.value,
                    used: false
                }
            } else {
                prov.city.forEach(city => {
                    let name = city.name
                    data[altSubstr(name)] = {
                        conNum: city.conNum,
                        used: false
                    }
                    if (city.conNum > maxInfection) maxInfection = city.conNum
                })
            }
        })
        fetch(censUrl).then(res => res.text()).then(cens => {

            const render = (method) => {

                d3.select("svg-frame").html("")
                let { formula, dataDefault, style, properties } = method

                const resetRegion = () => {
                    d3.select(".rate").html(dataDefault.toFixed(method.properties.toFixed))
                    d3.select(".city-name").html("China")
                    d3.select('.grad-bar').style('background', `linear-gradient(to right,${style.interpolation(0.2)},${style.interpolation(0.5)},${style.interpolation(0.9)})`)
                }
                resetRegion()

                d3.select('.title .light').text(properties.title)
                d3.select('.desc').text(properties.desc)

                d3.select("svg-frame")
                    .append("svg")
                    .attr("viewBox", [0, 0, 875, 910])
                    .append("g")
                    .selectAll("path")
                    .data(topoData)
                    .join("path")
                    .attr("class", "clickable")
                    .attr("fill", d => {
                        let cut = altSubstr(d.properties.NAME)
                        if (cut in data) {
                            data[cut].used = true
                            return style.paint(formula(cut, d.properties))
                        }
                        return '#222'
                    })
                    .attr("d", path)
                    .on("mouseover", d => {
                        let cut = altSubstr(d.properties.NAME)
                        d3.select('.city-name').text(d.properties.NAME)
                        if (cut in data) {
                            d3.select('.rate').text(formula(cut, d.properties).toFixed(method.properties.toFixed))
                            d3.select('.grad-bar').style('background', style.paint(formula(cut, d.properties)))
                        }
                        else {
                            d3.select('.rate').text(0)
                            d3.select('.grad-bar').style('background', '#222')
                        }
                    })
                    .on("mouseout", d => {
                        resetRegion()
                    })

                for (let city in data) {
                    if (!data[city].used) console.warn("Unused city", city)
                }
            }

            let population = new Map(d3.csvParse(cens, ({ city, population }) => [altSubstr(city), population]))
            console.log("Population Data from Census 2010", population)

            let methods = {
                ratio: {
                    formula: (cut, dProp) => data[cut].conNum / population.get(cut),
                    dataDefault: +raw.data.gntotal / 138000,
                    style: {
                        paint: d3.scalePow()
                            .interpolate(() => d3.interpolateInferno)
                            .exponent(0.3)
                            .domain([0, 1.5]),
                        interpolation: d3.interpolateInferno
                    },
                    properties: {
                        title: "Infection Ratio",
                        abbv: "Ratio",
                        desc: "Infections per 10,000 People",
                        toFixed: 4
                    }
                },
                density: {
                    formula: (cut, dProp) => data[cut].conNum / dProp.Shape_Area,
                    dataDefault: +raw.data.gntotal / 960,
                    style: {
                        paint: d3.scalePow()
                            .interpolate(() => d3.interpolateViridis)
                            .exponent(0.3)
                            .domain([0, 1500]),
                        interpolation: d3.interpolateViridis
                    },
                    properties: {
                        title: "Infection Density",
                        abbv: "Density",
                        desc: "Infections per 10,000 km²",
                        toFixed: 4
                    }
                },
                absolute: {
                    formula: (cut, dProp) => +data[cut].conNum,
                    dataDefault: +raw.data.gntotal,
                    style: {
                        paint: d3.scalePow()
                            .interpolate(() => d3.interpolateCividis)
                            .exponent(0.3)
                            .domain([0, 1500]),
                        interpolation: d3.interpolateCividis
                    },
                    properties: {
                        title: "Total Infections",
                        abbv: "Absolute",
                        desc: "Number of Infected People",
                        toFixed: 0
                    }
                },
            }

            for (let method in methods) {
                d3.select('.methods')
                    .append('input')
                    .attr('type', 'radio')
                    .attr('name', 'method-ratio')
                    .attr('id', method)
                    .on('click', () => render(methods[method]))

                d3.select('.methods')
                    .append('label')
                    .attr('for', method)
                    .attr('class', 'clickable')
                    .text(methods[method].properties.abbv)
            }

            // Fire the first render
            document.querySelector('label[for="ratio"]').click()

        })
    }).catch(function (ex) {
        console.log('parsing failed', ex)
    })

