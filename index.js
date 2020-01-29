const altSubstr = str => {
    if (str.substr(0, 2) == '张家') return str.substr(0, 3)
    if (str.substr(0, 3) == '公主岭') return "四平"
    if (str.substr(0, 2) == '第七') return "克拉"
    if (str.substr(0, 2) == '第八') return "石河"
    return str.substr(0, 2)
}

import fetchJsonp from 'fetch-jsonp'
let china = require('./data/china-proj.topo.json')
let censUrl = require('./data/2010-census.csv')

let data = {}
let maxInfection = 0
let path = d3.geoPath()

fetchJsonp('https://interface.sina.cn/news/wap/fymap2020_data.d.json')
    .then(function (response) {
        return response.json()
    }).then(function (raw) {
        console.log("Infection Data from Sina", raw)
        document.querySelector('#time').innerText = raw.data.times
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
                .domain([0, 500])
            // .range(["#222", "yellow"])

            let paint2 = d3.scaleSequential(d3.interpolateViridis).domain([0, maxInfection])

            d3.select("svg-frame")
                .append("svg")
                .attr("viewBox", [0, 0, 875, 910])
                .append("g")
                .selectAll("path")
                .data(topojson.feature(china, china.objects.provinces).features)
                .join("path")
                .attr("fill", d => {
                    let cut = altSubstr(d.properties.NAME)
                    if (cut in data) {
                        data[cut].used = true
                        return paint(data[cut].conNum / population.get(cut) * 1000)
                    }
                    return '#222'
                })
                .attr("d", path)
                .append("title")

            for (let city in data) {
                if (!data[city].used) console.warn("Unused city", city)
            }

        })



    }).catch(function (ex) {
        console.log('parsing failed', ex)
    })

