const altSubstr = str => {
    if (str.substr(0, 2) == '张家') return str.substr(0, 3)
    if (str.substr(0, 3) == '公主岭') return "四平"
    if (str.substr(0, 2) == '第七') return "克拉"
    if (str.substr(0, 2) == '第八') return "石河"
    return str.substr(0, 2)
}

import fetchJsonp from 'fetch-jsonp'
let china = require('./../data/china-proj.topo.json')
let censUrl = require('./../data/2010-census.csv')

let data = {}
let maxInfection = 0
let path = d3.geoPath()

fetchJsonp('https://interface.sina.cn/news/wap/fymap2020_data.d.json')
    .then(function (response) {
        return response.json()
    }).then(function (raw) {
        console.log("Infection Data from Sina", raw)
        raw.data.list.forEach(prov => {
            let special = { "北京": 0, "天津": 0, "重庆": 0, "上海": 0, "台湾": 1, "香港": 1, "澳门": 1 }
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

            let population = new Map(d3.csvParse(cens, ({ city, population }) => [altSubstr(city), population]))
            console.log("Population Data from Census 2010", population)

            let paint = d3.scalePow()
                .interpolate(() => d3.interpolateInferno)
                .exponent(0.3)
                .domain([0, 1500])

            document.querySelector('.grad-bar').style.background =
                `linear-gradient(to right,${d3.interpolateInferno(0.2)},${d3.interpolateInferno(0.5)},${d3.interpolateInferno(0.9)})`

            d3.select("svg-frame")
                .append("svg")
                .attr("viewBox", [0, 0, 875, 910])
                .append("g")
                .selectAll("path")
                .data(topojson.feature(china, china.objects.provinces).features)
                .join("path")
                .attr("class", "clickable")
                .attr("fill", d => {
                    let cut = altSubstr(d.properties.NAME)
                    if (cut in data) {
                        data[cut].used = true
                        return paint(data[cut].conNum / population.get(cut) * 1000)
                    }
                    return '#222'
                })
                .attr("d", path)
                .on("click", d => {
                    let cut = altSubstr(d.properties.NAME)
                    document.querySelector('.city-name').innerText = d.properties.NAME
                    if (cut in data) {
                        let n = data[cut].conNum / population.get(cut)
                        document.querySelector('.rate').innerText =
                            `${n.toFixed(4)}`
                    }
                    else document.querySelector('.rate').innerText = 0
                });


            for (let city in data) {
                if (!data[city].used) console.warn("Unused city", city)
            }

        })



    }).catch(function (ex) {
        console.log('parsing failed', ex)
    })

