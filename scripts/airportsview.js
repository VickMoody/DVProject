var airportDepChart;
var airportArrChart;
var selected_airports = [];

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + (days));
    return result;
}

function fillAirportsForLines() {

    d3.csv("data/by_airport.csv", function(error, airports) {
        var airports_by_states = {};
        airports.forEach(function(airport) {

            if (!(airport['airport_state'] in airports_by_states)) {
                airports_by_states[airport['airport_state']] = [];

            }
            airports_by_states[airport['airport_state']].push({ "short": airport['airport'], "full": airport["airport_name"] });
        });
        var sel1 = document.getElementById("airport-select");
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
console.log(airports_by_states);
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

        }
    });

}

function init_graph() {
    airportDepChart = new LineChart('Airports');


    airportDepChart.fileName = "by_airport";
    airportDepChart.columnToDraw = "dep_delays";
    airportDepChart.idField = "airport";

    airportDepChart.Init("arr-delays");


    airportArrChart = new LineChart('Airports');
    airportArrChart.yAxisTitle = "Average Arrival Delay(mins)";
    airportDepChart.yAxisTitle = "Average Departure Delay(mins)";

    airportArrChart.fileName = "by_airport";
    airportArrChart.columnToDraw = "arr_delays";
    airportArrChart.idField = "airport";

    airportArrChart.Init("dep-delays");
    Refresh();
}

function drawLineChart() {
    $('#airport-select').select2({
        placeholder: "Max 4 airports",
        maximumSelectionLength: 4,
        allowClear: true
    });
    $('#what').select2({
        placeholder: "Select a time ranges",
        minimumResultsForSearch: Infinity

    });
    fillAirportsForLines();
    init_graph();
}

function Refresh() {
    var selected = $('#airport-select').find(':selected');
    var toSelect = [];

    for (var i = 0; i < selected.length; i++) {
        toSelect.push(selected[i].value);
    }

    airportArrChart.columnToDraw = 'arr_' + $('#what').find(':selected')[0].value;
    airportDepChart.columnToDraw = 'dep_' + $('#what').find(':selected')[0].value;
    var xAxisLabel = "";
    switch ($('#what').find(':selected')[0].value) {
        case "delays":
            xAxisLabel = "Period Days";
            break;
        case "delay_month":
            xAxisLabel = "Months";
            break;
        case "delays_week":
            xAxisLabel = "Day of week";
            break;
        case "delay_day":
            xAxisLabel = "Time of day";
            break;
        default:
            xAxisLabel = "Unknown";
    }

    airportArrChart.xAxisTitle = xAxisLabel;
    airportDepChart.xAxisTitle = xAxisLabel;

    airportArrChart.DrawLines(toSelect);
    airportDepChart.DrawLines(toSelect);
}

function LineChart(type) {
    this.type = type;
    this.width = 0;
    this.height = 0;
    this.minDate = new Date(2015, 0, 1);
    this.maxDate = new Date(2015, 8, 31);
    this.svg = null;
    this.idField = "";
    this.conditionColumns = [];
    this.columnToDraw = "";
    this.xAxisTitle = "";
    this.yAxisTitle = "";
    this.fileName = "";
    this.previousColumnToDraw = '';
    this.current_selection = ['', '', '', ''];
    this.offset = 0;
    this.prevIds = [];
    this.Init = function(divName) {
        var margin = { top: 20, right: 28, bottom: 50, left: 55 },
            width = 1200 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;


        var svg = d3.select("#" + divName);

        var svg = d3.select("#" + divName).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        var g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
        g.append("g").attr("id", "yAxis");
        g.append("g")
            .attr("transform", "translate(0," + height + ")")
            .attr('id', 'xAxis');
        g.append("text").attr('id', 'xAxisLabel')
            .attr("transform",
                "translate(" + (width / 2) + " ," +
                (height + 30) + ")")
            .style("text-anchor", "middle")
            .text(this.xAxisTitle);

        g.append("text").attr('id', 'yAxisLabel')
            .attr("transform", "rotate(-90)")
            .attr("y", -55)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(this.yAxisTitle);
        this.width = width;
        this.height = height;
        this.svg = g;
    }
    this.DrawLines = function(ids) {
        var colors = ['red', 'green', 'blue', 'yellow'];
        var svg = this.svg;
        var days = ["Mon", "Tue", "Wed", "Thurs", "Fri", "Sat", "Sun"];
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Oct"];


        var offset = 0;
        var iScale = d3.scaleTime()
            .domain([this.minDate, this.maxDate])
            .range([0, this.width]);
        var yScale = d3.scaleLinear().range([this.height, 0]);
        var columnToDraw = this.columnToDraw;
        var prev = this.previousColumnToDraw;
        var tickValues = [];
        var current_selection = this.current_selection;
        var prevIds = this.prevIds;
        points = 0;
        if (columnToDraw.includes('month')) {
            iScale = d3.scaleLinear()
                .domain([0, 8])
                .range([0, this.width]);
            tickValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            points = 10;
        } else if (columnToDraw.includes('day')) {
            iScale = d3.scaleLinear()
                .domain([0, 23])
                .range([0, this.width]);
            tickValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
            points = 24;
        } else if (columnToDraw.includes('week')) {
            iScale = d3.scaleLinear()
                .domain([0, 6])
                .range([0, this.width]);
            tickValues = [0, 1, 2, 3, 4, 5, 6];
            points = 7;
        } else points = 273;

        var mindate = this.minDate;
        var valueline = d3.line()

            .x(function(d, i) { if (points == 273) return iScale(addDays(mindate, i)); return iScale(i); })
            .y(function(d, i) { return yScale(d); });

        var averages = Array.apply(null, { length: points }).map(function() { return 0; });
        var dataset = [];
        var type = this.type;
        var fileName = this.fileName;
        var idfield = this.idField;
        var width = this.width;
        var height = this.height;
        var xAxisTitle = this.xAxisTitle;
        var yAxisTitle = this.yAxisTitle;
        var conditionColumns = this.conditionColumns;
        d3.csv("data/" + fileName + ".csv", function(error, file) {
            if (error) throw error;

            var type = this.type;
            for (var i = 0; i < file.length; i++) {
                data = file[i][columnToDraw].split('"')[1].split(',');
                for (var j = 0; j < data.length; j++) {
                    averages[j] += parseInt(data[j]);
                }
                if (ids.length > 0 && !ids.includes(file[i][idfield]))
                    continue;

                dataset.push({});

                dataset[dataset.length - 1]['id'] = file[i][idfield];

                dataset[dataset.length - 1]['values'] = [];
                dataset[dataset.length - 1]['name'] = file[i]['airport_name'];
                for (var j = 0; j < data.length; j++) {

                    dataset[dataset.length - 1]['values'].push(parseInt(data[j]));
                }

            }
            for (var j = 0; j < averages.length; j++) {
                averages[j] = averages[j] / file.length;
            }


            dataset.push({ "id": "Average", "values": averages, "name": "Average" });
            var selected = svg.selectAll(".line");

            if (ids.length > 0) {
                for (var i = 0; i < 4; i++) {

                    for (var j = 0; j < ids.length; j++) {

                        if (current_selection[i] == ids[j]) {

                            break;
                        }
                    }
                    if (j == ids.length) {

                        current_selection[i] = '';
                    }
                }

                for (var i = 0; i < ids.length; i++) {
                    for (var j = 0; j < 4; j++)
                        if (current_selection[j] == ids[i])
                            break;
                    if (j == 4) {
                        for (var k = 0; k < 4; k++)
                            if (current_selection[k] == '') {
                                current_selection[k] = ids[i];
                                break;
                            }

                    }
                }
            }
            var joined = selected.
            data(dataset, function(d) { return d['id']; });

            joined.exit().remove();
            if (dataset.length == 0) {
                svg.append('p').text('no results');
                alert('empty');
                return;
            }

            yScale.domain([d3.min(dataset, function(d) {
                    var items = d['values'];
                    return items.reduce(function(a, b) {
                        return Math.min(a, b);
                    });
                }),
                d3.max(dataset, function(d) {
                    var items = d['values'];
                    return items.reduce(function(a, b) {
                        return Math.max(a, b);
                    });
                })
            ]);



            var xAxis = svg.select('#xAxis');
            var axis = d3.axisBottom(iScale);

            if (tickValues.length == 7)
                axis.ticks(dataset[0]['values'].length).tickValues(tickValues).tickFormat(function(d) { return days[d]; });
            if (tickValues.length == 10)
                axis.ticks(dataset[0]['values'].length).tickValues(tickValues).tickFormat(function(d) { return months[d]; });
            if (tickValues.length == 24)
                axis.ticks(dataset[0]['values'].length).tickValues(tickValues).tickFormat(function(d) { return String("00" + d).slice(-2) + ":00"; });
            xAxis.transition().duration(750).call(axis);


            // Add the Y Axis
            svg.select('#xAxisLabel').text(xAxisTitle);
            svg.select('#yAxisLabel').text(yAxisTitle);
            if (svg.select('#yAxisLabel').empty())
                alert('empty');
            // Add the Y Axis
            var yAxis = svg.select("#yAxis");
            var tooltip = d3.select("body").append("div").attr("class", "toolTip");
            yAxis.transition().duration(750).call(d3.axisLeft(yScale))



            var entered;


            if (dataset.length > 5)
                entered = joined.enter().
            append("path").merge(joined);
            else
                entered = joined.enter().
            append("path").call(transition).merge(joined);



            if (((dataset.length == 2) && (prevIds.length == 0 && ids.length > 0)) || (prev != '' && prev != columnToDraw)) {
                entered.attr("d", function(d, i) { return valueline(d['values']); }).call(transition);
            } else
                entered.attr("d", function(d, i) { return valueline(d['values']); })

            entered.attr("id", function(d, i) { return d['id']; })
                // .append("title").text(function(d, i) {if(d["id"]=="Average") {alert('hi');return "Average";} return d["name"]; });
                .on("mouseover", function(d) {
                    var text = d['id']=='Average'?'Average':d['id']+' - '+d['name'];
                    tooltip
                        .style("left", d3.event.pageX - 50 + "px")
                        .style("top", d3.event.pageY - 70 + "px")
                        .style("display", "inline-block")
                        .html(text);
                })
                .on("mouseout", function(d) { tooltip.style("display", "none"); });;

            entered.attr('class', function(d, i) { if (d["id"] == "Average") return "line average"; 
            if (dataset.length <= 5) return 'line selected' + current_selection.indexOf(d['id']);; return "line"; })
            .on("click",function(d){ tooltip.style("display", "none"); $('#airport-select').val(d['id']); $('#airport-select').trigger('change'); });

        });
        this.previousColumnToDraw = this.columnToDraw;
        this.prevIds = ids;
        //alert(this.columnToDraw);
    }

}

function dump(obj) {
    var out = '';
    for (var i in obj) {
        out += i + ": " + obj[i] + "\n";
    }
    return out;
}

function transition(path) {
    path.transition()
        .duration(1500)
        .attrTween("stroke-dasharray", tweenDash);
}

function tweenDash() {
    var l = this.getTotalLength(),
        i = d3.interpolateString("0," + l, l + "," + l);
    return function(t) { return i(t); };
}