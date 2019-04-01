// Chloropleth Variables
var mapMargin = {top: 20, bottom: 10, left: 10, right:10}
    , mapWidth = 600
    , mapWidth = mapWidth - mapMargin.left - mapMargin.right
    , mapRatio = 0.5
    , mapHeight = mapWidth * mapRatio
    , active = d3.select(null);

var drillView=false;

var pctFormat = d3.format(" >5.2%")
    errorCount = 0;

var mapSVG, stateColor, countyColor, mapG;

// Bar Variables
var barMargin = {top: 10, right: 10, bottom: 30, left: 225},
  barMargin2 = {top: 10, right: 10, bottom: 30, left: 10},
  barWidth = 550 - barMargin.left - barMargin.right,
  barHeight = 400 - barMargin.top - barMargin.bottom,
  barWidth2 = 100 - barMargin2.left - barMargin2.right;

var barSVG,barFocus,barContext,barTextScale,barXScale,barX2Scale,barYScale,barY2Scale,barXAxis,barYAxis, brushExtent;

// Chloropleth Elements
mapSVG = d3.select('.map').append('svg')
  .attr('class', 'center-container')
  .attr('height', mapHeight + mapMargin.top + mapMargin.bottom)
  .attr('width', mapWidth + mapMargin.left + mapMargin.right);

stateColor = d3.scaleSequential(d3.interpolateBlues),
countyColor = d3.scaleSequential(d3.interpolateBlues);

mapSVG.append('rect')
.attr('class', 'background center-container')
.attr('height', mapHeight + mapMargin.top + mapMargin.bottom)
.attr('width', mapWidth + mapMargin.left + mapMargin.right)
.on('click', clicked);

mapG = mapSVG.append("g")
  .attr('class', 'center-container center-items us-state')
  .attr('transform', 'translate('+mapMargin.left+','+mapMargin.top+')')
  .attr('width', mapWidth + mapMargin.left + mapMargin.right)
  .attr('height', mapHeight + mapMargin.top + mapMargin.bottom);

var projection = d3.geoAlbersUsa()
    .translate([mapWidth /2 , mapHeight / 2])
    .scale(mapWidth);

var path = d3.geoPath()
    .projection(projection);

//Common Elements
var tooltip = d3.select("#visualization").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

//Dropdown selection
var riskDropdown = d3.select("#risk_options");

function ready(error, us, data) {
  if (error) throw error;
  // console.log(data);

  // populate drop-down
  riskDropdown.on("change", updateRisk)
              .selectAll("option")
              .data(risks)
              .enter()
              .append("option")
              .attr("value", function(option) { return option.value; })
              .text(function(option) { return option.text; });

  var riskFiltererdData = data.filter(function (d){return d.risk_type==="totrisk"});

  //Create Chloropleth
  updateGraph(us, riskFiltererdData, false);

  //Create BarChart
  var pollData = getPollData(riskFiltererdData);
  createBar(pollData);

  //Main function for creatng chloropleth
  function updateGraph(us, data, drillView){
    console.log(data);

    var countyAgg = d3.nest()
    .key(function(d) { return d.state + d.county; })
    .rollup(function(v) { return {
      state_id: d3.max(v, function(d){ return parseInt(d.id); }),
      fips: d3.max(v, function(d){ return parseInt(d.fips); }),
      population: d3.max(v, function(d){ return d.population; }),
      val: d3.mean(v, function(d) { return d.val; })
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
      state_id: d3.max(v, function(d){ return parseInt(d.value.state_id); }),
      population: d3.sum(v, function(d){ return parseInt(d.value.population);}),
      val: d3.mean(v, function(d) { return parseFloat(d.value.val); })
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
    stateColor.domain([d3.min(stateAgg, function(d) { return d.value.val; }),
                  d3.max(stateAgg, function(d) { return d.value.val; })]);
    // countyColor.domain([d3.min(countyAgg, function(d) { return d.value[selected_risk]; }),
    //               d3.max(countyAgg, function(d) { return d.value[selected_risk]; })]);


    var countyMap = mapG.append("g"),
        stateMap = mapG.append("g");

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
            return stateColor(county_fip.value.val);
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
         .style("fill", function(d) {
           // console.log(d);
           // console.log(d.id, dictStates[d.id].value.totrisk);
            var value = dictStates[d.id].value.val;

            if (value) {
              return stateColor(value);
            } else {
              return stateColor(0);
            }
         })
         .on("click", clicked)
         .on("mouseover", showStateTip)
      	 .on("mouseout", hideTip);

      if (drillView) {
        mapG.select("path").on("click")();
      }

    function showStateTip(d) {
      var value = dictStates[d.id].value.val;
      if (value) {
         tooltip.transition()
         .duration(250)
         .style("opacity", 1);
         tooltip.html(
         "<p><strong>" + dictStates[d.id].key + "</strong></p>" +
         "<table><tbody>" +
         "<tr><td>Risk:</td><td>" + pctFormat(value) + "</td></tr></tbody></table>"
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
         "<tr><td>Risk:</td><td>" + pctFormat(county_fip.value.val) + "</td></tr></tbody></table>"
         )
         .style("left", (d3.event.pageX + 15) + "px")
         .style("top", (d3.event.pageY - 28) + "px"); }
    }
  }

  //Main function for creating BarChart
  function createBar(pollAgg){

    barSVG = d3.select(".bar_chart").append("svg")
      .attr("width", barWidth + barMargin.left + barMargin.right + barWidth2 + barMargin2.left + barMargin2.right)
      .attr("height", barHeight + barMargin.top + barMargin.bottom);

    barFocus = barSVG.append("g")
      .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")")
      .attr("class","focus");

    barContext = barSVG.append("g")
      .attr("class", "context")
      .attr("transform", "translate(" + (barMargin.left + barWidth + barMargin.right + barMargin2.left) + "," + barMargin2.top + ")");

    barTextScale = d3.scaleLinear()
        .domain([8,75])
        .range([12,6])
        .clamp(true);

    barXScale = d3.scaleLinear().range([0, barWidth]),
        barX2Scale = d3.scaleLinear().range([0, barWidth2]),
        barYScale = d3.scaleBand().range([0, barHeight]).paddingInner(0.4),
        barY2Scale = d3.scaleBand().range([0, barHeight]).paddingInner(0.4);

    //Create x axis object
    barXAxis = d3.axisBottom(barXScale),
        barYAxis = d3.axisLeft(barYScale).tickSize(0).tickSizeOuter(0);

    pollAgg.sort(function(a,b) { return b.value.val - a.value.val; });
    // console.log(pollAgg);

    barXScale.domain([0, d3.max(pollAgg, function(d) { return d.value.val; })]);
    barX2Scale.domain([0, d3.max(pollAgg, function(d) { return d.value.val; })]);
    barYScale.domain(pollAgg.map(function(d) { return d.key; }));
    barY2Scale.domain(pollAgg.map(function(d) { return d.key; }));

    var brush = d3.brushY()
      .extent([[0, 0],[barWidth2, barHeight]])
      .on("brush", brushed);

    var zoom = d3.zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([[0, 0],[barWidth, barHeight]])
      .extent([[0, 0],[barWidth, barHeight]])
      .on("zoom", zoomed);

    // Add the X Axis
    barFocus.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + barHeight + ")")
      .call(barXAxis);

    barFocus.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(-5, 0)")
      .call(barYAxis);

    barSVG.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", barWidth)
      .attr("height", barHeight);

    // barSVG.append("rect")
    //   .attr("class", "zoom")
    //   .attr("width", barWidth)
    //   .attr("height", barHeight)
    //   .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")")
    //   .call(zoom);

    var focus_group = barFocus.append("g");
    focus_group.attr("clip-path", "url(#clip)");

    var rects = focus_group.selectAll('rect')
      .data(pollAgg);

    //********* Bar Chart 1 ****************
    var newRects1 = rects.enter();

    newRects1.append('rect')
      .attr('class', 'bar mainBars')
      .attr('y', function(d, i) {
        return barYScale(d.key) + barYScale.bandwidth();
      })
      .attr('x', 0)
      .attr('height', 8)
      .attr('width', function(d, i) {
        return barXScale(d.value.val);
      })
      .attr('opacity', 0.85)
      .style('fill', '#b3003b')
      .style('stroke', '#80002a')
      // .on("click", function(d) {
      //   // console.log(d, d.key);
      //   updatePoll(d.key);
      // })
      .on("mouseover", showPollTip)
      .on("mouseout", hidePollTip);

    var focus_group = barContext.append("g");
    focus_group.attr("clip-path", "url(#clip)");

    var brushRects = focus_group.selectAll('rect')
      .data(pollAgg);

    //********* Brush Bar Chart ****************
    var brushRects1 = brushRects.enter();

    brushRects1.append('rect')
      .attr('class', 'bar mainBars')
      .attr('y', function(d, i) {
        return barY2Scale(d.key);
      })
      .attr('x', 0)
      .attr('width', function(d, i) {
        return barX2Scale(d.value.val);
      })
      .attr('opacity', 0.85)
      .attr('height', 5)
      .style('fill', '#4d0019')
      .style('stroke', '#330011');

    if (pollAgg.length > 8) { brushExtent = 8;}
    else {brushExtent = pollAgg.length - 1;}

    barContext.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, ([barY2Scale(pollAgg[0].key), barY2Scale(pollAgg[brushExtent].key)]));

    //create brush function redraw barChart with selection
    function brushed() {
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom

      // get bounds of selection
      var s = d3.event.selection,
          nD = [];
      barY2Scale.domain().forEach((d)=>{
        var pos = barY2Scale(d) + barY2Scale.bandwidth()/2;
        if (pos > s[0] && pos < s[1]){
          nD.push(d);
        }
      });

      barYScale.domain(nD);

      barFocus.selectAll(".mainBars")
        .style("opacity", function(d){
          return barYScale.domain().indexOf(d.key) === -1 ? 0 : 100;
        })
        .attr("y", function(d) {
          // console.log(y.bandwidth(), nD.length);
          return barYScale(d.key)+ barYScale.bandwidth()/4;
        })
        .attr("x", 0)
        .attr('width', function(d, i) {
          return barXScale(d.value.val)
        })
        .attr('opacity', 0.85)
        .attr('height', barYScale.bandwidth()/1.1);

      //Update the label size
      d3.selectAll(".y.axis")
        .style("font-size", barTextScale(nD.length) + "px");

      barFocus.select(".y.axis").call(barYAxis);

      //Find the new max of the bars to update the x scale
      var newMaxXScale = d3.max(pollAgg, function(d) {
        // console.log(d.key, nD.indexOf(d.key), d.value.val);
        return nD.indexOf(d.key) > -1 ? d.value.val : 0;
      });
      // console.log(nD, newMaxXScale);
      barXScale.domain([0, newMaxXScale]);

      //Update the x axis of the big chart
      d3.select(".focus")
        .select(".x.axis")
        .transition()
        // .duration(50)
        .call(barXAxis);

      barSVG.select(".zoom").call(zoom.transform, d3.zoomIdentity
        .scale(barWidth / (s[1] - s[0]))
        .translate(-s[0], 0));
    }

    function zoomed() {
    }

    function showPollTip(d) {
         tooltip.transition()
         .duration(250)
         .style("opacity", 1);
         tooltip.html(
         "<p><strong>" + d.key + "</strong></p>" +
         "<table><tbody>" +
         "<tr><td>Risk:</td><td>" + d.value.val + "</td></tr></tbody></table>"
         )
         .style("left", (d3.event.pageX + 15) + "px")
         .style("top", (d3.event.pageY - 28) + "px");

         updatePoll(d.key);
    }
  }

  function getPollData(data) {
    var pollAgg = d3.nest()
    .key(function(d) { return d.pollutant; })
    .rollup(function(v) { return {
      val: d3.mean(v, function(d) { return d.val; })
    }; })
    .entries(data);
    // console.log(JSON.stringify(pollAgg), pollAgg.length);
    return pollAgg;
  }

  function updateRisk() {
  	var riskValue = this.value;
  	riskFiltererdData = data.filter(function (d){return d.risk_type===riskValue});

    //Update Chloropleth
    if (drillView) {
      updateGraph(us, riskFiltererdData, true);
    } else {
      updateGraph(us, riskFiltererdData, false);
    }

    //Update BarChart
    var pollData = getPollData(riskFiltererdData);
    d3.select(".bar_chart").select("svg").remove();
    createBar(pollData);
  }

  function updatePoll(pollName) {
  	pollFiltererdData = riskFiltererdData.filter(function (d){return d.pollutant===pollName });

      console.log(pollName, pollFiltererdData);
    //Update Chloropleth
    if (drillView) {
      updateGraph(us, pollFiltererdData, true);
    } else {
      updateGraph(us, pollFiltererdData, false);
    }
  }

  function hideTip() {
    tooltip.transition()
    .duration(250)
    .style("opacity", 0);
  }

  function hidePollTip() {
    tooltip.transition()
    .duration(250)
    .style("opacity", 0);

    //Update Chloropleth
    if (drillView) {
      updateGraph(us, riskFiltererdData, true);
    } else {
      updateGraph(us, riskFiltererdData, false);
    }
  }
};

// Load multiple files at once
d3.queue()
    // .defer(d3.json, "../data/us-states.json")
    .defer(d3.json, "../data/us-counties.topojson")
    .defer(d3.csv, "../data/alldatapivot.csv")
    .await(ready);

function clicked(d) {
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
      scale = .9 / Math.max(dx / mapWidth, dy / mapHeight),
      translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];

  mapG.transition()
      .duration(750)
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}

function reset() {
  drillView=false;
    active.classed("active", false);
    active = d3.select(null);
    mapG.transition()
        .delay(100)
        .duration(750)
        .style("stroke-width", "1.5px")
        .attr('transform', 'translate('+mapMargin.left+','+mapMargin.top+')');
}
