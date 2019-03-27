var margin = {top: 10, bottom: 10, left: 10, right:10}
    , width = parseInt(d3.select('.viz').style('width'))
    , width = width - margin.left - margin.right
    , mapRatio = 0.5
    , height = width * mapRatio
    , active = d3.select(null);

var drillView=false;
var drillContext, drillData;

var fmt = d3.format(" >5.2%")
    errorCount = 0;

var svg = d3.select('.viz').append('svg')
    .attr('class', 'center-container')
    .attr('height', height + margin.top + margin.bottom)
    .attr('width', width + margin.left + margin.right);

var stateColor = d3.scaleSequential(d3.interpolateBlues),
    countyColor = d3.scaleSequential(d3.interpolateBlues);

var projection = d3.geoAlbersUsa()
    .translate([width /2 , height / 2])
    .scale(width);

var path = d3.geoPath()
    .projection(projection);

tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

// populate drop-down
d3.select("#risk_options")
  .selectAll("option")
  .data(risks)
  .enter()
  .append("option")
  .attr("value", function(option) { return option.value; })
  .text(function(option) { return option.text; });

svg.append('rect')
.attr('class', 'background center-container')
.attr('height', height + margin.top + margin.bottom)
.attr('width', width + margin.left + margin.right)
.on('click', clicked);

var g = svg.append("g")
  .attr('class', 'center-container center-items us-state')
  .attr('transform', 'translate('+margin.left+','+margin.top+')')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom);

function ready(error, us, data) {
  if (error) throw error;

  // console.log(data);

  // dropdown dataset selection
  var dropDown = d3.select("#risk_options");
  dropDown.on("change", function() {
    selected_risk = d3.event.target.value;
    // updateGraph(selected_risk, us, data);
    if (drillView) {
      updateGraph(selected_risk, us, data, true);
    } else {
      updateGraph(selected_risk, us, data, false);
    }
  });

  // initial dataset on load
  var selected_risk = "totrisk";
  updateGraph(selected_risk, us, data, false);
};

function updateGraph(selected_risk, us, data, drillView){
  var countyAgg = d3.nest()
  .key(function(d) { return d.state + d.county; })
  .rollup(function(v) { return {
    count: v.length,
    state_id: d3.max(v, function(d){ return parseInt(d.id); }),
    fips: d3.max(v, function(d){ return parseInt(d.fips); }),
    population: d3.max(v, function(d){ return d.population; }),
    [selected_risk]: d3.mean(v, function(d) { return d[selected_risk]; })
  }; })
  .entries(data);
  // console.log("County Agg: ", JSON.stringify(countyAgg));

  //create objects with county fip and data as key-value pairs
  var dictCounties = {};
  countyAgg.forEach(function(d) {
      d["state"] = d.key.substring(0,2);
      d["county"] = d.key.substring(2,d.key.length);
      dictCounties[d.value.fips] = d;
  });
  // console.log(dictCounties);

  var stateAgg = d3.nest()
  .key(function(d) { return d.key.substring(0,2) ; })
  .rollup(function(v) { return {
    count: v.length,
    state_id: d3.max(v, function(d){ return parseInt(d.value.state_id); }),
    population: d3.sum(v, function(d){ return parseInt(d.value.population);}),
    [selected_risk]: d3.mean(v, function(d) { return parseFloat(d.value[selected_risk]); })
  }; })
  .entries(countyAgg);
  // console.log(JSON.stringify(stateAgg));

  //create objects with state id and data as key-value pairs
  var dictStates = {};
  stateAgg.forEach(function(d) {
      dictStates[d.value.state_id] = d;
  });
  // console.log(dictStates);

  //Set input domain for color scale
  stateColor.domain([d3.min(stateAgg, function(d) { return d.value[selected_risk]; }),
                d3.max(stateAgg, function(d) { return d.value[selected_risk]; })]);
  // countyColor.domain([d3.min(countyAgg, function(d) { return d.value[selected_risk]; }),
  //               d3.max(countyAgg, function(d) { return d.value[selected_risk]; })]);


  var countyMap = g.append("g"),
      stateMap = g.append("g");

  countyMap.attr("id", "counties")
      .selectAll("path")
      .data(topojson.feature(us, us.objects.counties).features)
      .enter().append("path")
      .attr("d", path)
      .attr("class", "county-boundary")
      .on("click", reset)
      // .call(updateCountyFill, selected_risk)
      .style("fill", function(d) {
        // console.log(d);
        // console.log(d.id, dictCounties[d.id]);
        var county_fip = dictCounties[d.id];
        if (county_fip)
          return stateColor(county_fip.value[selected_risk]);
        else {
            errorCount++;
            // console.log(d.id + " Not found" + " errors = " + errorCount);
            return stateColor(0);
        }
      })
      .on("mouseover", showCountyTip)
       .on("mouseout", hideTip);

  stateMap.attr("id", "states")
      .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
       .enter()
       .append("path")
       .attr("d", path)
       .attr("class", "state")
       .on("click", clicked)
       .style("fill", function(d) {
         // console.log(d);
         // console.log(d.id, dictStates[d.id].value.totrisk);
          var value = dictStates[d.id].value[selected_risk];

          if (value) {
            return stateColor(value);
          } else {
            return stateColor(0);
          }
       })
       .on("mouseover", showStateTip)
    	 .on("mouseout", hideTip);

    if (drillView) {
      g.select("path").on("click")();
    }

    function showStateTip(d) {
      var value = dictStates[d.id].value[selected_risk];
      if (value) {
         tooltip.transition()
         .duration(250)
         .style("opacity", 1);
         tooltip.html(
         "<p><strong>" + dictStates[d.id].key + "</strong></p>" +
         "<table><tbody>" +
         "<tr><td>Risk:</td><td>" + fmt(value) + "</td></tr></tbody></table>"
         )
         .style("left", (d3.event.pageX + 15) + "px")
         .style("top", (d3.event.pageY - 28) + "px"); }
    }

    function showCountyTip(d) {
      var county_fip = dictCounties[d.id];
        if (county_fip) {
         tooltip.transition()
         .duration(250)
         .style("opacity", 1);
         tooltip.html(
         "<p><strong>" + county_fip.county + ", " + county_fip.state + "</strong></p>" +
         "<table><tbody>" +
         "<tr><td>Risk:</td><td>" + fmt(county_fip.value[selected_risk]) + "</td></tr></tbody></table>"
         )
         .style("left", (d3.event.pageX + 15) + "px")
         .style("top", (d3.event.pageY - 28) + "px"); }
    }

    function hideTip() {
      tooltip.transition()
      .duration(250)
      .style("opacity", 0);
    }
}

// Load multiple files at once
d3.queue()
    // .defer(d3.json, "../data/us-states.json")
    .defer(d3.json, "../data/us-counties.topojson")
    .defer(d3.json, "../data/alldata.json")
    .await(ready);

  function clicked(d) {
    // if (!drillView) {
    //   drillContext = this;
    //   drillData = d;
    // }
    drillView=true;
    if (d3.select('.background').node() === this) return reset();

    if (active.node() === this) return reset();

    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = .9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    g.transition()
        .duration(750)
        .style("stroke-width", 1.5 / scale + "px")
        .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
  }

  function reset() {
    drillView=false;
      active.classed("active", false);
      active = d3.select(null);
      g.transition()
          .delay(100)
          .duration(750)
          .style("stroke-width", "1.5px")
          .attr('transform', 'translate('+margin.left+','+margin.top+')');
  }
