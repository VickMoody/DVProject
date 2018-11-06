function fillAirportsforBars() {
    d3.csv("data/by_airport.csv", function(error, airports) {
        var airports_by_states = {};
        airports.forEach(function(airport) {
            if (!(airport['airport_state'] in airports_by_states)) {
                airports_by_states[airport['airport_state']] = [];
            }
            airports_by_states[airport['airport_state']].push({ "short": airport['airport'], "full": airport["airport_name"] });
        });
        var keys = Object.keys(airports_by_states);


var i, len = keys.length; 

keys.sort(); 

var sortedDict ={};


for (i = 0; i < len; i++)
{
    
    k = keys[i];

    var sorted =airports_by_states[k];
    sorted.sort(function(a,b) {return (a.short > b.short) ? 1 : ((b.short > a.short) ? -1 : 0);} ); 

    sortedDict[k]=sorted;
}
airports_by_states =sortedDict; 
        var sel1 = document.getElementById("route-from");
        var sel2 = document.getElementById("route-to");

        for (var state in airports_by_states) {
            var gr = document.createElement("OPTGROUP");
            gr.label = state;
            gr.title = convert_state(state, 'name');
            for (var i = 0; i < airports_by_states[state].length; i++) {
                var g = document.createElement("OPTION");
                g.text = airports_by_states[state][i]["short"];
                g.value = airports_by_states[state][i]["short"];
                g.title = airports_by_states[state][i]["full"];
                gr.appendChild(g);
            }
            sel1.add(gr);
            sel2.add(gr.cloneNode(true));
        }
    });
}

function RenderBars() {
    d3.select('#palette').remove();

    var svg = d3.select("svg"),
        margin = { top: 20, right: 20, bottom: 30, left: 80 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")").attr('id', 'palette');

    var x0 = d3.scaleBand()
        .rangeRound([0, width - 60])
        .paddingInner(0.1);

    var x1 = d3.scaleBand()
        .padding(0.05);

    var y = d3.scaleLinear()
        .rangeRound([height, 0]);

    var z = d3.scaleOrdinal()
        .range(["#e98195", "#FF0800", "#c10000", "#49000e"]);

    d3.csv("data/by_flight.csv", function(d, i, columns) {

        for (var i = 3, n = columns.length; i < n - 1; ++i) d[columns[i]] = +d[columns[i]];

        return d;
    }, function(error, data) {

        if (error) throw error;

        var from = $('#route-from').find(':selected').length > 0 ? $('#route-from').find(':selected')[0].value : '';
        var to = $('#route-to').find(':selected').length > 0 ? $('#route-to').find(':selected')[0].value : '';

        var keys = ['cluster1_count', 'cluster2_count', 'cluster3_count', 'cancelled_count'];
        var airlines = data.reduce(function(airlines, row) {
            if (row.airline in airlines) {
                airlines[row.airline]['cluster1_count'] += row.cluster1_count;
                airlines[row.airline]['cluster2_count'] += row.cluster2_count;
                airlines[row.airline]['cluster3_count'] += row.cluster3_count;
                airlines[row.airline]['cancelled_count'] += row.cancelled_count;

            } else {
                if ((from == '' && to == '') || (row.origin == from && row.dest == to)) {
                    airlines[row.airline] = {};
                    airlines[row.airline]['cluster1_count'] = 0;
                    airlines[row.airline]['cluster2_count'] = 0;
                    airlines[row.airline]['cluster3_count'] = 0;
                    airlines[row.airline]['cancelled_count'] = 0;

                    airlines[row.airline]['full_name'] = row.full_name;
                }
            }

            return airlines;
        }, {});
        data = [];

        for (key in airlines) {
            var v = {
                airline: key,
                cluster1_count: airlines[key]['cluster1_count'],
                cluster2_count: airlines[key]['cluster2_count'],
                cluster3_count: airlines[key]['cluster3_count'],
                cancelled_count: airlines[key]['cancelled_count'],
                full_name: airlines[key]['full_name']
            };
            data.push(v);
        }
        if (data.length == 0) {
            alert('No Flights found for the specified route');
            return;
        }
        x0.domain(data.map(function(d) { return d.airline; }));
        x1.domain(keys).rangeRound([0, x0.bandwidth()]);
        y.domain([0, d3.max(data, function(d) { return d3.max(keys, function(key) { return d[key]; }); })]).nice();
        var labels = ["cancelled", ">45mins delay", "<45 mins delay", "<5mins delay"];
        var tooltip = d3.select("body").append("div").attr("class", "toolTip");

        g.append("g")
            .selectAll("g")
            .data(data)
            .enter().append("g")
            .attr("transform", function(d) { return "translate(" + x0(d.airline) + ",0)"; })
            .selectAll("rect")
            .data(function(d) { return keys.map(function(key) { return { key: key, value: d[key], full_name: d.full_name }; }); })
            .enter().append("rect")

            .attr("y", function(d) { return y(d.value); })
            .attr("width", x1.bandwidth())
            .attr("height", function(d) { return height - y(d.value); })
            .attr("fill", function(d) { return z(d.key); })

            .transition()
            .delay(function(d, i) { return i * 200; })
            .duration(1000)
            .attr("x", function(d) { return x1(d.key); });

        g.select("g").selectAll("rect")
            .on("mouseover", function(d) {
                tooltip
                    .style("left", d3.event.pageX - 50 + "px")
                    .style("top", d3.event.pageY - 100 + "px")
                    .style("display", "inline-block")
                    .html(d.full_name + "<br/>" + (d.value) + " Flights<br/> " + labels[labels.length - keys.indexOf(d.key) - 1]);
            })
            .on("mouseout", function(d) { tooltip.style("display", "none"); });;

        g.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x0)).selectAll('text').attr("transform", "rotate(45)");
        g.append("text")
            .attr("transform",
                "translate(" + (width / 2) + " ," +
                (height + 30) + ")")
            .style("text-anchor", "middle")
            .text('Airlines');
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(null, "s"))
            .append("text")
            .attr("x", 2)
            .attr("y", y(y.ticks().pop()) - 15)
            .attr("dy", "0.32em")
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .text("Number of Flights");

        var legend = g.append("g")
            .attr("font-size", 10)
            .attr("text-anchor", "end")
            .attr("id", "barlegend")
            .selectAll("g")
            .data(keys.slice().reverse())
            .enter().append("g")
            .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
            .attr("x", width - 19)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", z);

        legend.append("text")
            .attr("x", width - 20)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(function(d, i) { return labels[i]; });
    });
}

function drawBars() {
    $('#route-from').select2({
        placeholder: "Origin",
        allowClear: true
    });
    $('#route-to').select2({
        placeholder: "Destination",
        allowClear: true
    });
    fillAirportsforBars();
    $('#route-from').val(null).trigger('change');
    $('#route-to').val(null).trigger('change');
    RenderBars();
}

function drawPieChart(mode) {
    var from = $('#route-from').find(':selected').length > 0 ? $('#route-from').find(':selected')[0].value : '';
    var to = $('#route-to').find(':selected').length > 0 ? $('#route-to').find(':selected')[0].value : '';
    if (from == "" && to == "") {
        mode = "overview";
    }
    d3.select("#cancelpie").remove();
    if (mode == "overview") {
        d3.csv("data/by_airline.csv", function(error, data) {
            if (error) throw error;
            renderPie(data);
        });
    } else if (mode == "route") {
        d3.csv("data/by_flight.csv", function(error, data) {
            if (error) throw error;
            var datalist = [];
            data.forEach(function(row) {
                if (row['origin'] == from && row['dest'] == to) {
                    var entry = {
                        origin: row['origin'],
                        destination: row['dest'],
                        airline: row['airline'],
                        cancelledA: row['cancelledA'],
                        cancelledB: row['cancelledB'],
                        cancelledC: row['cancelledC'],
                        cancelledD: row['cancelledD']
                    };
                    datalist.push(entry);
                }
            });
            renderPie(datalist);
        });
    }
}
var color = d3.scaleOrdinal().domain(["Weather", "Airline", "Air System", "Security", "Aircraft", "Other"])
    .range(["#92b1cf", "#fef764", "#bcada6", "#5fa874", "#937c52", "#9cb806"]);

function renderPie(data) {
    if (data.length == 0) {
        //                alert('No Flights found for the specified route');
        return;
    }

    var height = 265;
    var width = document.getElementById("piechart").offsetWidth - 15;
    var cancelsvg = d3.select("#piechart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "cancelpie");

    var radius = (Math.min(width, height) / 2),
        group = cancelsvg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d.value; });

    var path = d3.arc()
        .outerRadius(radius - 30)
        .innerRadius(0);

    var label = d3.arc()
        .outerRadius(0)
        .innerRadius(radius + 40);
    var cancelledA = 0,
        cancelledB = 0,
        cancelledC = 0,
        cancelledD = 0,
        cancelset = [],
        totalCancel = 0;

    data.forEach(function(row) {

        cancelledA = cancelledA + parseInt(row['cancelledA']);
        cancelledB = cancelledB + parseInt(row['cancelledB']);
        cancelledC = cancelledC + parseInt(row['cancelledC']);
        cancelledD = cancelledD + parseInt(row['cancelledD']);
    });

    totalCancel = cancelledA + cancelledB + cancelledC + cancelledD;

    if (cancelledB != 0) {
        cancelset.push({ key: "Weather", value: cancelledB });
    }
    if (cancelledA != 0) {
        cancelset.push({ key: "Airline", value: cancelledA });
    }
    if (cancelledC != 0) {
        cancelset.push({ key: "Air System", value: cancelledC });
    }
    if (cancelledD != 0) {
        cancelset.push({ key: "Security", value: cancelledD });
    }

    if (totalCancel != 0) {
        var arc = group.selectAll(".fraction")
            .data(pie(cancelset))
            .enter().append("g")
            .attr("class", "fraction");

        arc.append("path")
            .attr("d", path)
            .attr("fill", function(d, i) { return color(d.data.key); });
        arc.append("text")
            .attr("transform", function(d, i) {
                var xyarray = label.centroid(d);
                if (cancelset.length > 1) {
                    xyarray[1] -= 10 * i;
                    xyarray[0] -= 10 * i;
                }
                return "translate(" + xyarray + ")";

            })
            .attr("dy", "0.35em")
            .text(function(d, i) { return d.data.key + " " + (Number((d.value / totalCancel * 100).toFixed(2)).toString()) + "%"; });
    }
}

function drawDelayBars(mode) {
    d3.select("#barchart").remove();
    var from = $('#route-from').find(':selected').length > 0 ? $('#route-from').find(':selected')[0].value : '';
    var to = $('#route-to').find(':selected').length > 0 ? $('#route-to').find(':selected')[0].value : '';

    if (from == "" && to == "") {
        mode = "overview";
    }
    var airsystemDelay = 0,
        securityDelay = 0,
        airlineDelay = 0,
        aircraftDelay = 0,
        weatherDelay = 0,
        otherDelay = 0,
        datalist = [],
        totalDelay = 0;
    if (mode == "overview") {
        d3.csv("data/by_airline.csv", function(error, data) {
            if (error) throw error;

            data.forEach(function(row) {

                airsystemDelay += parseInt(row['air_system_delay']);
                securityDelay += parseInt(row['security_delay']);
                airlineDelay += parseInt(row['airline_delay']);
                aircraftDelay += parseInt(row['aircraft_delay']);
                weatherDelay += parseInt(row['weather_delay']);
                otherDelay += parseInt(row['other_delay']);


            });


            datalist.push({ type: "Air System", delay: airsystemDelay }, { type: "Security", delay: securityDelay }, { type: "Airline", delay: airlineDelay }, { type: "Aircraft", delay: aircraftDelay }, { type: "Weather", delay: weatherDelay }, { type: "Other", delay: otherDelay });

            renderDelayBars(datalist);
        });
    } else if (mode == "route") {
        d3.csv("data/by_flight.csv", function(error, data) {
            if (error) throw error;
            var datalist = [];
            data.forEach(function(row) {
                if (row['origin'] == from && row['dest'] == to) {
                    airsystemDelay = airsystemDelay + parseInt(row['air_system_delays_count']);
                    securityDelay = securityDelay + parseInt(row['security_delays_count']);
                    airlineDelay = airlineDelay + parseInt(row['airline_delays_count']);
                    aircraftDelay = aircraftDelay + parseInt(row['aircraft_delays_count']);
                    weatherDelay = weatherDelay + parseInt(row['weather_delays_count']);
                    otherDelay = otherDelay + parseInt(row['others_count']);
                }
            });
            datalist.push({ type: "Air System", delay: airsystemDelay }, { type: "Security", delay: securityDelay }, { type: "Airline", delay: airlineDelay }, { type: "Aircraft", delay: aircraftDelay }, { type: "Weather", delay: weatherDelay }, { type: "Other", delay: otherDelay });
            renderDelayBars(datalist);
        });
    }
}

function renderDelayBars(data) {
    if (data.length == 0) {
        //alert('No Flights found for the specified route');
        return;
    }
    var height = 270;
    var width = document.getElementById("piechart").offsetWidth - 15;
    var margin = { top: 20, right: 10, bottom: 50, left: 35 };
    var delaysvg = d3.select("#delaybars").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "barchart");

    var tooltip = d3.select("body").append("div").attr("class", "toolTip");

    var x = d3.scaleBand().rangeRound([margin.left, width - margin.right]).padding(0.1),
        y = d3.scaleLinear().rangeRound([height - margin.bottom - margin.top, 15]);
    x.domain(data.map(function(d) { return d.type; }));
    y.domain([0, d3.max(data, function(d) { return d.delay })]).nice();

    delaysvg.append("g")
        .attr("class", "axis xaxis")
        .attr("transform", "translate(0," + (height - margin.bottom + 5) + ")")
        .call(d3.axisBottom(x)).selectAll('text').attr("transform", "rotate(45)");

    delaysvg.selectAll(".tick").selectAll("line").attr("transform", "translate(0,-15)");

    delaysvg.append("g")
        .attr("class", "axis yaxis")
        .call(d3.axisLeft(y).ticks(null, "s"))
        .append("text")
        .attr("x", 2)
        .attr("y", y(y.ticks().pop()) - 15)
        .attr("dy", "0.32em")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text("Number of Delays");

    delaysvg.select(".yaxis").attr("transform", "translate(35,0)");
    delaysvg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.type); })
        .attr("y", function(d) { return y(d.delay); })
        .attr("fill", function(d) { return color(d.type) })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return parseInt(height - margin.bottom - margin.top - y(d.delay)); })
        .on("mouseover", function(d) {
            tooltip
                .style("left", d3.event.pageX - 50 + "px")
                .style("top", d3.event.pageY - 100 + "px")
                .style("display", "inline-block")
                .html(d.type + " Delay <br/>" + (d.delay) + " Flights<br/> ");
        })
        .on("mouseout", function(d) { tooltip.style("display", "none"); });;;
}

function dump(obj) {
    var out = '';
    for (var i in obj) {
        out += i + ": " + obj[i] + "\n";
    }
    return out;
}