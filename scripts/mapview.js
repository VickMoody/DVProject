function updateMap(elem) {
    d3.selectAll(".commonttip").classed("hidden", true);
    d3.select("#donutsvg").remove();
    if (elem.innerHTML == "Busy") {
        if (!elem.classList.contains("active")) {
            document.getElementById("delayedbtn").classList.remove("active");
            elem.classList.add("active");
            drawMap("busy");
            document.getElementById("legend-img").src="images/busy.jpg";
        }
    } else {
        if (!elem.classList.contains("active")) {
            document.getElementById("busybtn").classList.remove("active");
            elem.classList.add("active");
            drawMap("delayed");
            document.getElementById("legend-img").src="images/delay.jpg";
        }
    }
}

function drawDonut(airport) {
    d3.select("#donutsvg").remove();

    var data = [{ airport: airport.airport, type: "Delayed", value: parseInt(airport['dep_delay_count']) + parseInt(airport['arr_delay_count']) },
        { airport: airport.airport, type: "On Time", value: parseInt(airport['flights_count']) - parseInt(airport['dep_delay_count']) - parseInt(airport['arr_delay_count']) }
    ];
    var tot = parseInt(airport['flights_count']);

    var width = 330,
        height = 330,
        margin = { top: 10, right: 10, bottom: 10, left: 10 },
        color = d3.scaleOrdinal().range(["#FF0800"]),
        padAngle = 0.015,
        cornerRadius = 3, // sets how rounded the corners are on each slice
        percentFormat = d3.format(',.2%');

    var radius = Math.min(width, height) / 2;
    var pie = d3.pie()
        .value(function(d) { return d.value; })
        .sort(null);

    var arc = d3.arc()
        .outerRadius(radius * 0.8)
        .innerRadius(radius * 0.6)
        .cornerRadius(cornerRadius)
        .padAngle(padAngle);

    var svg = d3.select("#donutdiv").append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr("id", "donutsvg")
        .append('g')
        .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
    svg.append("circle").attr("id", "donutback").attr('r', radius * 0.70).style("fill", "#f9f7f6").style("stroke-width", "10").style("stroke", "#F5F5F5");
    svg.append('g').attr('class', 'slices');
    svg.append('g').attr('class', 'labelName');

    var path = svg.select('.slices')
        .datum(data)
        .selectAll('path')
        .data(pie)
        .enter()
        .append('path')
        .attr('fill', function(d) { return color(d.data.type); })
        .transition().delay(function(d, i) {
            return i * 500;
        }).duration(1000)
        .attrTween('d', function(d) {
            var i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
            return function(t) {
                d.endAngle = i(t);
                return arc(d)
            }
        });
    //.attr('d', arc);


    function midAngle(d) { return d.startAngle + (d.endAngle - d.startAngle) / 2; }

    d3.select("#donutsvg").select(".slices").selectAll("path")['_groups'][0][1].remove();

    svg.append('circle')
        .attr('class', 'toolCircle')
        .attr('r', radius * 0.55)
        .style('fill', color(data[0].type))
        .style('fill-opacity', 0)
        .style("stroke-width", 0);
    svg.append("text")
        .attr('class', 'toolCircle')
        .attr('dy', -20)
        .text("Delayed")
        .attr("fill", "#FF0800");
    svg.append("text")
        .attr('class', 'toolCircle number')
        .attr('dy', 20)
        .text(Number(data[0].value / tot * 100).toFixed(2).toString() + "%").attr("fill", "#FF0800");
    d3.select('#donutsvg').on('mouseover', function(d) {
            d3.select(".number").text(data[0].value + " of " + tot);
        })
        .on('mouseout', function() {
            d3.select(".number").text(Number(data[0].value / tot * 100).toFixed(2).toString() + "%");
        });

}

function drawMap(mode) {
    var map = document.getElementById("map-svg");
    if (map != null) {
        map.parentNode.removeChild(map);
    }
    var w = document.getElementById('mapdiv').offsetWidth,
        h = 550;
    var svg = d3.select("#mapdiv").insert("svg:svg", "h2")
        .attr("width", w)
        .attr("height", h)
        .attr("id", "map-svg");

    if (window.innerWidth >= 1200) {
        var projection = d3.geo.albersUsa().
        translate([w / 2, h / 2])
            .scale([w - 650]);
        svg.attr("viewBox", "150 70 1250 480");
    } else {
        var projection = d3.geo.albersUsa().
        translate([w / 2, h / 2])
            .scale([w - 350]);
        svg.attr("viewBox", "100 80 900 450");
    }
    var path = d3.geo.path()
        .projection(projection);

    var states = svg.append("svg:g")
        .attr("id", "states");

    var circles = svg.append("svg:g")
        .attr("id", "circles");

    var cells = svg.append("svg:g")
        .attr("id", "cells");

    var state_abbr = {};

    d3.csv("data/states.csv", function(error, states) {
        states.forEach(function(state) {
            state_abbr[state.State] = state.Abbreviation;
        })
    });

    d3.json("data/us-states.json", function(collection) {

        states.selectAll("path")
            .data(collection.features)
            .enter().append("svg:path")
            .attr("d", path)
            .attr('class', 'normalpath')
            .attr('id', function(d) {
                return state_abbr[d.properties.name];
            });
    });

    d3.csv("data/arcs_count.csv", function(error, flights) {
        var linksByOrigin = {},
            countByAirport =[],
            locationByAirport = {},
            countByArcs = {},
            delayByArcs = {},
            positions = [];

        function createArc(pair) {
            return {
                type: "LineString",
                coordinates: [locationByAirport[pair.source], locationByAirport[pair.target]]
            };

        }

        flights.forEach(function(flight) {
            var origin = flight.origin,
                destination = flight.dest,
                links = linksByOrigin[origin] || (linksByOrigin[origin] = []);
            links.push({
                source: origin,
                target: destination
            });
            countByAirport[origin] = (countByAirport[origin] || 0) + parseInt(flight.count);
            countByAirport[destination] = (countByAirport[destination] || 0) + parseInt(flight.count);
            if (origin in countByArcs == false) {

                countByArcs[origin] = {};
            }
            if (origin in delayByArcs == false) {

                delayByArcs[origin] = {};
            }

            countByArcs[origin][destination] = flight.count;
            delayByArcs[origin][destination] = flight.average_delay;


        });
        
        var counts = [];
        
        for(var key in countByAirport){
            
            counts.push(Math.round(Math.sqrt(parseInt(countByAirport[key]))));
        }
        console.log(counts);
        d3.csv("data/by_airport.csv", function(error, airports) {
            var delayByAirport = [];

            airports.forEach(function(row) {
                delayByAirport.push({
                    key: row.airport,
                    value: (parseInt(row['dep_delay_avg']) + parseInt(row['arr_delay_avg'])) * ((parseInt(row['dep_delay_count']) + parseInt(row['arr_delay_count'])) / parseInt(row['flights_count']))
                });
            });

            // Only consider airports with at least one flight.
            airports = airports.filter(function(airport) {

                if (countByAirport[airport.airport]) {
                    var location = [+airport.longitude, +airport.latitude];
                    locationByAirport[airport.airport] = location;
                    positions.push(projection(location));
                    return true;
                }
            });

            // Compute the Voronoi diagram of airports' projected positions.
            var polygons = d3.geom.voronoi(positions);

            var g = cells.selectAll("g")
                .data(airports)
                .enter().append("svg:g");

            g.append("svg:path")
                .attr("class", "cell")
                .attr("d", function(d, i) {
                    return "M" + polygons[i].join("L") + "Z";
                })
                .on("click", function(d, i) {
                    drawDonut(d);
                    d3.selectAll(".commonttip").classed("hidden", true);
                    var selected = d3.select(this);
                    var coord = d3.mouse(this);
                    var txt = d3.select("body").append("div")
                        .attr("class", "commonttip")
                        .classed("hidden", false)
                        .style("top", coord[1] + "px")
                        .style("left", coord[0] + "px");
                    txt.append("a").attr("class", "close").on("click", function() {
                        d3.selectAll(".commonttip").classed("hidden", true);
                        d3.select("#donutsvg").remove();
                    });;;
                    //txt.append("span").text(d.airport).append("br");
                    txt.append("span").text(d.airport_name).append("br");
                    txt.append("span").text(d.airport_city + "," + convert_state(d.airport_state, 'name')).append("br");

                    txt.append("span").text("Arrival avg delay: " + Number(d.arr_delay_avg).toFixed(2).toString()+" mins").append("br");
                    txt.append("span").text("Departure avg delay: " + Number(d.dep_delay_avg).toFixed(2).toString()+" mins").append("br");

                }).attr("style", "cursor: pointer;").append("title").text(function(d, i) {
                    return d.airport;
                });


                


            g.selectAll("path.arc")
                .data(function(d) {
                    return linksByOrigin[d.airport] || [];
                })
                .enter().append("svg:path")
                .attr("class", "arc")
                .attr("stroke", function(d) {
                    if (mode == "busy") {
                        var incoming = countByArcs[d.target][d.source]==null?0:countByArcs[d.target][d.source];
                        var number = parseInt(countByArcs[d.source][d.target]) + parseInt(incoming);
                        
                        if (number<= 200) {
                            return "#e98195";
                        } else if (number <= 1000) {
                            return "#FF0800";
                        } else {
                            return "#3c000a";
                        }
                    } else {
                        if (delayByArcs[d.source][d.target] <= 5) {
                            return "#e98195";
                        } else if (delayByArcs[d.source][d.target] <= 45) {
                            return "#FF0800";
                        } else {
                            return "#3c000a";
                        }
                    }
                })
                .attr("d", function(d) {
                    var x = path(createArc(d));
                    return x;
                });

            if (mode == "busy") {
                var circleScale = d3.scaleLinear().range([2, 30]).domain([d3.min(counts, function(d) { 
                    return parseInt(d);
                }), d3.max(counts, function(d) {
                    return parseInt(d);
                })]);
            } else {
                var circleScale = d3.scaleLinear().range([2, 10]).domain([d3.min(delayByAirport, function(d) {
                    return Math.sqrt(parseInt(d.value));
                }), d3.max(delayByAirport, function(d) {
                    return Math.sqrt(parseInt(d.value));;
                })]);
            }
            // if (mode == "busy") {
            //     var circleScale = d3.scaleLinear().range([1, 5]).domain([Math.min(countByAirport), Math.max(countByAirport)]);
            // } else {
            //     var circleScale = d3.scaleLinear().range([2, 15]).domain([d3.min(delayByAirport, function(d) {
            //         return d.value;
            //     }), d3.max(delayByAirport, function(d) {
            //         return d.value;
            //     })]);
            // }
            
            console.log(delayByAirport);
            circles.selectAll("circle")
                .data(airports)
                .enter().append("svg:circle")
                .attr("cx", function(d, i) {
                    return positions[i][0];
                })
                .attr("cy", function(d, i) {
                    return positions[i][1];
                })
                .attr("r", function(d, i) {
                    if (mode == "busy") {
                       
                        return circleScale(Math.sqrt(countByAirport[d.airport]));
                    } else {
                       
                       // return circleScale(Math.sqrt(delayByAirport[i].value));
                        var number = Math.sqrt(delayByAirport[i].value);
                        console.log(number);
                        if(number<4)
                            return 2;
                       if(number<4.8)
                        return 5;
                        if(number<5.0)
                            return 8;
                        if(number <5.5)
                            return 11;
                        return 14;
                    }
                })
                .sort(function(a, b) {
                    return countByAirport[a.airport] - countByAirport[b.airport];
                })
                .append("title").text(function(d, i) {
                    return d.airport;
                });;
        });
    });
}
function dump(obj) {
    var out = '';
    for (var i in obj) {
        out += i + ": " + obj[i] + "\n";
    }
    return out;
}