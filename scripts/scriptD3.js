
// Chloropleth Variables
var mapMargin = {top: 15, bottom: 10, left: 10, right:0}
    , mapWidth = 850
    , mapWidth = mapWidth - mapMargin.left - mapMargin.right
    , mapRatio = 0.6
    , mapHeight = mapWidth * mapRatio
    , active = d3.select(null)
    , legendWidth = 600
    , legendHeight = 135;

var mapSVG, mapColor, mapTitle, mapG, countyMap, stateMap, legendSVG, legend;
var countyData, stateData, countyAgg, stateAgg, dictCounties, dictState;

// BarChart Variables
var barMargin = {top: 20, right: 10, bottom: 60, left: 200}
    , barMargin2 = {top: 20, right: 10, bottom: 30, left: 10}
    , barWidth = 550 - barMargin.left - barMargin.right
    , barHeight = 450 - barMargin.top - barMargin.bottom
    , barWidth2 = 100 - barMargin2.left - barMargin2.right;

var barSVG, barTitle, focus,context,
    textScale,xScale,x2Scale,yScale,y2Scale,
    xAxis,yAxis,yAxis2,
    brushExtent, pollData;

//Click and Hover control variables for chloropleth and barchart
var currStateSel, currCountySel, selStateID, selState="", selStateName, selCounty, selCountyPath, selCountyColor, selStateFeature, stateView, selPollBar, selPoll;
var countyClickSelFil;
var countyClick = false,
    countyLoad = false,
    pollClick = false;

//Common Variables
var selRisk = "totrisk", selRiskString = "Total Cancer Risk";

// Chloropleth SVG
mapSVG = d3.select('.map').append('svg')
  .attr('class', 'center-container')
  .attr('height', mapHeight + mapMargin.top + mapMargin.bottom)
  .attr('width', mapWidth + mapMargin.left + mapMargin.right);

// Chloropleth colors
mapColorGreen = d3.scaleSequential(d3.interpolate("#ecf9ec", "#267326"))
    .domain([0,0.5]);
mapColorYellow = d3.scaleSequential(d3.interpolate("#fff5cc", "#ffcc00"))
    .domain([0.5,1]);
mapColorRed1 = d3.scaleSequential(d3.interpolate("#ffcccc", "#ff1a1a"))
    .domain([1,50]);
mapColorRed2 = d3.scaleSequential(d3.interpolate("#ff0000", "#cc0000"))
    .domain([50,100]);
mapColorRed3 = d3.scaleSequential(d3.interpolate("#b30000", "#800000"))
    .domain([100,195]);

//Chloropleth Title
mapTitle = mapSVG.append('text')
                  .attr("class", "chartTitle")
                  .attr("fill", "#2e3d49")
                  .attr('transform', 'translate('+(mapMargin.left+mapWidth * 0.2)+','+(mapMargin.top + (mapWidth * .04))+')')
                  .text(selRiskString + " Assessment")

// Other chloropleth elements
mapSVG.append('rect')
      .attr('class', 'background center-container')
      .attr('height', mapHeight + mapMargin.top + mapMargin.bottom)
      .attr('width', mapWidth + mapMargin.left + mapMargin.right);

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
var tooltip = d3.select("body").append("div")
              	.attr("class", "tooltip")
              	.style("opacity", 0);

//Dropdown
var riskDropdown = d3.select("#risk_options");

//Capture dropdown change
riskDropdown.on("change", updateRisk);

// Draw initial chloropleth (state level view)
showStates();
// Draw legend
showLegend();

//Main function for drawing state level chloropleth.
//Also defines the on click, mouseover and mouseout events for the state level chloropleth.
//Invokes function to draw the pollutant bar chart as well.
function showStates() {
  stateView = true;
  var stateFile = "../data/StateData/" + selRisk + ".csv";

  d3.json("../data/us-counties.topojson", function(us) {
      d3.csv(stateFile, function(error, data) {
        if (error) throw error;
        // console.log(data);
        stateData = data;

        if (pollClick) {
          pollDataFil = data.filter(function (d){return d.pollutant==selPoll});
          stateAgg = d3.nest()
                        .key(function(d) { return d.id ; })
                        .rollup(function(v) { return {
                          state: d3.max(v, function(d){ return d.state; }),
                          val: d3.mean(v, function(d) { return parseFloat(d.val); }),
                          stateFull: d3.max(v, function(d){ return d.state_name; }),
                          population: d3.max(v, function(d){ return d.population; })
                        }; })
                        .entries(pollDataFil);
        } else {
          stateAgg = d3.nest()
                        .key(function(d) { return d.id ; })
                        .rollup(function(v) { return {
                          state: d3.max(v, function(d){ return d.state; }),
                          val: d3.mean(v, function(d) { return parseFloat(d.val); }),
                          stateFull: d3.max(v, function(d){ return d.state_name; }),
                          population: d3.max(v, function(d){ return d.population; })
                        }; })
                        .entries(data);
        }
        // console.log(JSON.stringify(stateAgg));

        //create objects with state id and data as key-value pairs
        dictStates = {};
        stateAgg.forEach(function(d) {
            dictStates[d.key] = d;
        });
        // console.log(dictStates);

        stateMap = mapG.append("g");

        stateMap.attr("id", "states")
                .selectAll("path")
                .data(topojson.feature(us, us.objects.states).features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("class", "state")
                .attr("fill", "#b3b3b3")
                .attr("stroke", "#d9d9d9")
                .attr("stroke-width", 0.5)
                .call(updateStateFill)
                .on("click", function(d){
                  selStateID = d.id;
                  selState = dictStates[d.id].value.state;
                  selStateName = dictStates[d.id].value.stateFull;
                  if (pollClick) {
                    mapTitle.text(selRiskString + ' Assessment for ' + selPoll + ' in '+ selStateName);
                  } else {
                    mapTitle.text(selRiskString + ' Assessment for ' + selStateName);
                  }
                  selStateFeature = d;
                  d3.select("#states").remove();
                  hideTip();
                  showCounty(selStateID);
                  countyZoom();
                  d3.selectAll("button.state_reset").style("display", "inline-block");
                  setTimeout(setCountyLoadStatus, 1000);
                })
                .on("mouseover", function(d){
                  selStateID = d.id;
                  stateDataFil = data.filter(function (d){return d.id==selStateID});
                  if (!pollClick) {
                    d3.select(".bar_chart").select("svg").remove();
                    getPollData(stateDataFil);
                    createBar(pollData, data);
                  }
                  stateHover(d);
                })
                .on("mouseout", function(d) {
                  if (!pollClick) {
                    d3.select(".bar_chart").select("svg").remove();
                    getPollData(data);
                    createBar(pollData, data);
                  }
                  hideTip();
                });

        d3.select(".bar_chart").select("svg").remove();
        getPollData(data);
        createBar(pollData, data);
    })
  });
}

//Function to update the colors for the different states in the chloropleth
function updateStateFill(selection) {
  currStateSel = selection;
  selection.transition()
           .duration(100)
           .attr("fill", function(d) {
             if (dictStates[d.id]) {
                var value = dictStates[d.id].value.val;

                if (value) {
                  if (value < 0.5){
                    return mapColorGreen(value);
                  } else if (value <= 1) {
                    return mapColorYellow(value);
                  } else if (value <= 50) {
                    return mapColorRed1(value);
                  } else if (value <= 100) {
                    return mapColorRed2(value);
                  } else {
                    return mapColorRed3(value);
                  }
                } else {
                  return "grey";
                }
            } else {
              return "grey";
            }
           });
}

//Main function for drawing county level chloropleth.
//Also defines the on click, mouseover and mouseout events for the county level chloropleth.
function showCounty(fips) {
  stateView = false;
	var countyFile = "../data/CountyData/" + selRisk + "/" + selRisk + selState + ".csv";

  d3.json("../data/us-counties-full.topojson", function(us) {
    d3.csv(countyFile, function(error, data) {
      if (error) throw error;
      countyData = data;

      if (pollClick) {
        pollDataFil = data.filter(function (d){return d.pollutant==selPoll});
        countyAgg = d3.nest()
                      .key(function(d) { return d.fips; })
                      .rollup(function(v) { return {
                        county: d3.max(v, function(d){ return d.county; }),
                        val: d3.mean(v, function(d) { return d.val; }),
                        countyPop: d3.max(v, function(d){ return d.population; })
                      }; })
                      .entries(pollDataFil);
      } else {
        countyAgg = d3.nest()
                      .key(function(d) { return d.fips; })
                      .rollup(function(v) { return {
                        county: d3.max(v, function(d){ return d.county; }),
                        val: d3.mean(v, function(d) { return d.val; }),
                        countyPop: d3.max(v, function(d){ return d.population; })
                      }; })
                      .entries(data);
      }
      // console.log("County Agg: ", JSON.stringify(countyAgg));

      //create objects with county fip and data as key-value pairs
      dictCounties = {};
      countyAgg.forEach(function(d) {
          dictCounties[d.key] = d;
      });
      // console.log(dictCounties);

      countyMap = mapG.append("g");

      countyMap.attr("id", "counties")
              .selectAll("path")
              .data(topojson.feature(us, us.objects.collection).features.filter(function(d) {return d.properties.state_fips == fips;}))
              .enter()
              .append("path")
              .attr("d", path)
              .attr("class", "county")
              .attr("fill", "#b3b3b3")
              .attr("stroke", "#d9d9d9")
              .attr("stroke-width", 0.1)
              .call(updateCountyFill)
              .on("click", function(d){
                if (!pollClick) {

                  countyClick = true;
                  d3.selectAll("button.county_reset").style("display", "inline-block");
                  d3.select(".selected").classed("selected", false);
                  d3.select(this).classed("selected", true);
                  countyFips = d.properties.fips;
                  selCounty = dictCounties[d.properties.fips].value.county;
                  mapTitle.text(selRiskString + " Assessment for " + selCounty + ", " + selState);
                  countyDataFil = data.filter(function (d){return d.fips==countyFips});
                  countyClickSelFil = countyDataFil;
                  if (!pollClick) {
                    d3.select(".bar_chart").select("svg").remove();
                    getPollData(countyDataFil);
                    createBar(pollData, data);
                  }
                }
              })
              .on("mouseover", function(d) {
                countyFips = d.properties.fips;
                countyDataFil = data.filter(function (d){return d.fips==countyFips});
                if (!pollClick) {
                  d3.select(".bar_chart").select("svg").remove();
                  getPollData(countyDataFil);
                  createBar(pollData, data);
                }
                countyHover(d);
              })
              .on("mouseout", function(d) {
                if (!pollClick) {
                  d3.select(".bar_chart").select("svg").remove();
                  if (countyClick) {
                    getPollData(countyClickSelFil);
                    createBar(pollData, data);
                  } else {
                    getPollData(data);
                    createBar(pollData, data);
                  }
                }
                hideTip();
              });

      if (!pollClick) {
        d3.select(".bar_chart").select("svg").remove();
        getPollData(data);
        createBar(pollData, data);
      } else {
        barTitle.text('Risk Level by Pollutant for ' + selStateName);
      }
    })
  });
}

//Function to update the colors for the different counties in the chloropleth
function updateCountyFill(selection) {
  currCountySel = selection;
  selection.transition()
           .duration(100)
           .attr("fill", function(d) {
             countyObj = dictCounties[d.properties.fips];
             if (countyObj) {
                var value = countyObj.value.val;
                if (value < 0.5){
                  return mapColorGreen(value);
                } else if (value <= 1) {
                  return mapColorYellow(value);
                } else if (value <= 50) {
                  return mapColorRed1(value);
                } else if (value <= 100) {
                  return mapColorRed2(value);
                } else {
                  return mapColorRed3(value);
                }
              }
              else {
                return "grey";
              }
           });
}

//Function to control the zoom of the county level view
function countyZoom() {
  var bounds = path.bounds(selStateFeature),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2;
      if (selState == 'AK' || selState == 'HI') {
        var scale = .65 / Math.max(dx / mapWidth, dy / mapHeight),
        translate = [mapWidth / 3.5 - scale * x, (mapHeight / 3.5 - scale * y) + (mapWidth * .085)];
      }
      else {
        var scale = .8 / Math.max(dx / mapWidth, dy / mapHeight),
        translate = [mapWidth / 2 - scale * x, (mapHeight / 2 - scale * y) + (mapHeight * .06)];
      }

  mapG.transition()
      .duration(1000)
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}

//Function to reset chloropleth to state view. Called from the 'Reset State' button.
function resetState(){
    d3.selectAll("button.state_reset").style("display", "none");
    d3.selectAll("button.county_reset").style("display", "none");
    selState="";
    d3.select("#counties").remove();
    if (pollClick) {
      mapTitle.text(selRiskString + " Assessment for " + selPoll);
    } else {
      mapTitle.text(selRiskString + " Assessment");
    }
    countyClick = false;
    countyLoad = false;
    hideTip();
    showStates();
    mapG.transition()
      .delay(50)
      .duration(550)
      .style("stroke-width", "1.5px")
      .attr('transform', 'translate('+mapMargin.left+','+mapMargin.top+')');
}

//Function to reset county selections in the chloropleth. Called from the 'Reset County' button.
function resetCounty() {
  countyClick = false;
  d3.selectAll("button.county_reset").style("display", "none");
  d3.select("#counties").remove();
  if (pollClick) {
    mapTitle.text(selRiskString + " Assessment for " + selPoll + " in " + selStateName);
  } else {
    mapTitle.text(selRiskString + ' Assessment for ' + selStateName);
  }
  showCounty(selStateID);
  countyZoom();
}

//Function to get pollutant and their levels as key value
function getPollData(data) {
  pollData = d3.nest()
                .key(function(d) { return d.pollutant; })
                .rollup(function(v) { return {
                  val: d3.mean(v, function(d) { return d.val; })
                }; })
                .entries(data);
  // console.log(JSON.stringify(pollData), pollData.length);
}

//Main function for drawing the main bar chart as well as the brush chart.
//Also defines the on click, mouseover and mouseout events for the main bar chart.
function createBar(pollData, data){

    barSVG = d3.select(".bar_chart").append("svg")
                .attr("width", barWidth + barMargin.left + barMargin.right + barWidth2 + barMargin2.left + barMargin2.right)
                .attr("height", barHeight + barMargin.top + barMargin.bottom);

    //Bar Title
    barTitle = barSVG.append('text')
                      .attr("fill", "#2e3d49")
                      .attr("class", "chartTitle")
                      .attr('transform', 'translate('+(barMargin.left - 60) + "," + (barMargin.top) +')');

    if (stateView) {
      barTitle.text("Risk Level by Pollutant");
    } else if (countyClick) {
      barTitle.text("Risk Level by Pollutant for " + selCounty + ", " + selState);
    } else {
      barTitle.text('Risk Level by Pollutant for ' + selStateName);
    }

    focus = barSVG.append("g")
                  .attr("transform", "translate(" + (barMargin.left) + "," + (barMargin.top + 40) + ")")
                  .attr("class","focus");

    context = barSVG.append("g")
                    .attr("class", "context")
                    .attr("transform", "translate(" + (barMargin.left + barWidth + barMargin.right + barMargin2.left) + "," + (barMargin2.top + 40) + ")");

    textScale = d3.scaleLinear()
                  .domain([8,75])
                  .range([12,6])
                  .clamp(true);

    xScale = d3.scaleLinear().range([0, barWidth]),
    x2Scale = d3.scaleLinear().range([0, barWidth2]),
    yScale = d3.scaleBand().range([0, barHeight]).paddingInner(0.4),
    y2Scale = d3.scaleBand().range([0, barHeight]).paddingInner(0.4);

    //Create axis objects
    xAxis = d3.axisBottom(xScale).ticks(5),
    yAxis = d3.axisLeft(yScale).tickSize(0).tickSizeOuter(0),
    yAxis2 = d3.axisLeft(y2Scale);

    pollData.sort(function(a,b) { return b.value.val - a.value.val; });

    xScale.domain([0, d3.max(pollData, function(d) { return d.value.val; })]);
    x2Scale.domain([0, d3.max(pollData, function(d) { return d.value.val; })]);
    yScale.domain(pollData.map(function(d) { return d.key; }));
    y2Scale.domain(pollData.map(function(d) { return d.key; }));

    var brush = d3.brushY()
                  .extent([[0, 0],[barWidth2, barHeight]])
                  .on("brush", brushed);

    var zoom = d3.zoom()
                .scaleExtent([1, Infinity])
                .translateExtent([[0, 0],[barWidth, barHeight]])
                .extent([[0, 0],[barWidth, barHeight]])
                .on("zoom", zoomed);

    // Add the X Axis
    focus.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + barHeight + ")")
          .call(xAxis);

    // Add the Y Axis
    focus.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate(-1, 0)")
          .call(yAxis);

    barSVG.append("defs").append("clipPath")
          .attr("id", "clip")
          .append("rect")
          .attr("width", barWidth)
          .attr("height", barHeight);

    var focus_group = focus.append("g").attr("clip-path", "url(#clip)");

    var rects = focus_group.selectAll('rect').data(pollData);

    //Bar Chart 1
    var newRects1 = rects.enter();

    newRects1.append('rect')
              .attr('id', 'mainBars')
              .attr('class', 'bar mainBars')
              .attr('y', function(d, i) {
                return yScale(d.key) + yScale.bandwidth();
              })
              .attr('x', 0)
              .attr('height', 8)
              .attr('width', function(d, i) {
                return xScale(d.value.val);
              })
              .attr('opacity', 0.85)
              .style('fill', '#0086b3')
              .style('stroke', '#0086b3')
              .on("click", function(d) {
                if (!countyClick) {
                  if (pollClick) {
                    d3.select(selPollBar).style("fill", '#0086b3')
                                        .style('stroke', '#0086b3');
                  }
                  pollClick = true;
                  selPollBar = this;
                  selPoll = d.key;
                  if (selState.length > 0) {
                    mapTitle.text(selRiskString + ' Assessment for ' + selPoll + ' in '+ selStateName);
                  } else if (!countyClick){
                    mapTitle.text(selRiskString + " Assessment for " + selPoll);
                  }
                  d3.selectAll("button.poll_reset").style("display", "inline-block");
                  d3.select(this).style('fill', '#4dd2ff')
                                  .style('stroke', '#4dd2ff');
                  updatePoll(selPoll, data);
                }
              })
              .on("mouseover", function(d){
                d3.select(this).style('fill', '#4dd2ff')
                                .style('stroke', '#4dd2ff');
                pollHover(d);
                //Update chloropleth only if there is no county selection
                if (!countyClick) {
                  updatePoll(d.key, data);
                }
              })
              .on("mouseout", function(d){
                d3.select(this).style('fill', '#0086b3')
                                .style('stroke', '#0086b3');
                hideTip();
                if (pollClick) {
                  d3.select(selPollBar).style('fill', '#4dd2ff')
                                        .style('stroke', '#4dd2ff');
                  updatePoll(selPoll, data);
                }
                if (!countyClick) {
                //Update chloropleth only if there is no county selection
                  resetPoll();
                }
              });

    var focus_group = context.append("g").attr("clip-path", "url(#clip)");

    var brushRects = focus_group.selectAll('rect').data(pollData);

    //Brush Bar Chart
    var brushRects1 = brushRects.enter();

    brushRects1.append('rect')
                .attr('class', 'bar miniBars')
                .attr('y', function(d, i) {
                  return y2Scale(d.key);
                })
                .attr('x', 0)
                .attr('width', function(d, i) {
                  return x2Scale(d.value.val);
                })
                .attr('opacity', 0.85)
                .attr('height', 5)
                .style('fill', '#004d66')
                .style('stroke', '#004d66');

    if (pollData.length > 8) { brushExtent = 8;}
    else {brushExtent = pollData.length - 1;}

    context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, ([y2Scale(pollData[0].key), y2Scale(pollData[brushExtent].key)]));

    //create brush function redraw barChart with selection
    function brushed() {
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom

      // get bounds of selection
      var s = d3.event.selection,
          nD = [];
      y2Scale.domain().forEach((d)=>{
        var pos = y2Scale(d) + y2Scale.bandwidth()/2;
        if (pos > s[0] && pos < s[1]){
          nD.push(d);
        }
      });

      yScale.domain(nD);

      focus.selectAll(".mainBars")
            .style("opacity", function(d){
              return yScale.domain().indexOf(d.key) === -1 ? 0 : 100;
            })
            .attr("y", function(d) {

              // console.log(y.bandwidth(), nD.length);
              return yScale(d.key); //+ yScale.bandwidth()/4;
            })
            .attr("x", 0)
            .attr('width', function(d, i) {
              return xScale(d.value.val)
            })
            .attr('opacity', 0.85)
            .attr('height', yScale.bandwidth()/1.1);

      //Update the label size
      d3.selectAll(".y.axis")
        .style("font-size", textScale(nD.length) + "px");

      focus.select(".y.axis").call(yAxis);

      //Find the new max of the bars to update the x scale
      var newMaxXScale = d3.max(pollData, function(d) {
        return nD.indexOf(d.key) > -1 ? d.value.val : 0;
      });
      xScale.domain([0, newMaxXScale]);

      //Update the x axis of the big chart
      d3.select(".focus")
        .select(".x.axis")
        .transition()
        .duration(250)
        .call(xAxis);

      barSVG.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(barWidth / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed() {
    }

    //Highlight the selected pollutant bar after redraw
    if (pollClick) {
      d3.selectAll(".mainBars").filter(function(d) {
        return d.key == selPoll;
      }).style("fill", '#4dd2ff').style('stroke', '#4dd2ff');
    }
}

//Function to return tooltip for state level view
function stateHover(d) {
  if (dictStates[d.id]) {
    displayState = dictStates[d.id].value.state;
    displayValue = dictStates[d.id].value.val;
    displayStateName = dictStates[d.id].value.stateFull;
    displayPopulation = dictStates[d.id].value.population;
  } else {
    stateName = stateData.filter(function (s){
      return s.id==d.id
    });
    displayState = stateName[0].state;
    displayStateName = stateName[0].state_name;
    displayValue = "Data Not Available";
  }

  displayHTML = "<p><strong>" + displayStateName + "</strong></p>" +
  "<table><tbody>" +
  "<tr><td>Population</td><td>:</td><td>" + displayPopulation + "</td></tr>"

  if (dictStates[d.id]) {
    displayHTML = displayHTML + "<tr><td>Risk</td><td>:</td><td>" + displayValue + "</td></tr></tbody></table>"
  } else {
    displayHTML = displayHTML + "</tbody></table>"
  }

   tooltip.transition()
           .duration(100)
           .style("opacity", 1);
           tooltip.html(displayHTML)
           .style("left", (d3.event.pageX + 15) + "px")
           .style("top", (d3.event.pageY - 28) + "px");
}

//Function to return tooltip for state level view
function countyHover(d) {
  if (dictCounties[d.properties.fips]) {
    displayCounty = dictCounties[d.properties.fips].value.county;
    displayValue = dictCounties[d.properties.fips].value.val;
    displayPopulation = dictCounties[d.properties.fips].value.countyPop;
  } else {
    countyName = countyData.filter(function (c){
      return c.fips==d.properties.fips
    });
    displayCounty = countyName[0].county;
    displayValue = "Data Not Available";
  }

  displayHTML = "<p><strong>" + displayCounty + ", " + selState + "</strong></p>" +
  "<table><tbody>" +
  "<tr><td>Population</td><td>:</td><td>" + displayPopulation + "</td></tr>"

  if (dictCounties[d.properties.fips]) {
    displayHTML = displayHTML + "<tr><td>Risk</td><td>:</td><td>" + displayValue + "</td></tr></tbody></table>"
  } else {
    displayHTML = displayHTML + "</tbody></table>"
  }

   tooltip.transition()
           .duration(100)
           .style("opacity", 1);
           tooltip.html(displayHTML)
           .style("left", (d3.event.pageX + 15) + "px")
           .style("top", (d3.event.pageY - 28) + "px");
}

//Function to hide tooltips
function hideTip() {
  tooltip.transition()
          .duration(250)
          .style("opacity", 0);
}

//Function to return tooltip for main bar chart
function pollHover(d) {
  tooltip.transition()
          .duration(100)
          .style("opacity", 1);
  tooltip.html(
              "<p><strong>" + d.key + "</strong></p>" +
              "<table><tbody>" +
              "<tr><td>Risk:</td><td>" + d.value.val + "</td></tr></tbody></table>"
          )
          .style("left", (d3.event.pageX + 15) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
}

//Function to update vizualizations based on drop down selection
function updateRisk() {
  selRisk = this.value;
  selRiskString = this[this.selectedIndex].text;

  var modal = document.getElementById('myModal');

  if (stateView) {
    if (pollClick) {
      mapTitle.text(selRiskString + ' Assessment for ' + selPoll);
    } else {
      mapTitle.text(selRiskString + ' Assessment');
    }
  	var riskFile = "../data/StateData/" + selRisk + ".csv";

    d3.csv(riskFile, function(error, data) {
      if (error) throw error;
      stateData = data;
      stateAgg = d3.nest()
                    .key(function(d) { return d.id ; })
                    .rollup(function(v) { return {
                    state: d3.max(v, function(d){ return d.state; }),
                    val: d3.mean(v, function(d) { return parseFloat(d.val); }),
                    stateFull: d3.max(v, function(d){ return d.state_name; }),
                    population: d3.max(v, function(d){ return d.population; })
                    }; })
                    .entries(data);

      dictStates = {};
      stateAgg.forEach(function(d) {
        dictStates[d.key] = d;
      });
      d3.select(".bar_chart").select("svg").remove();
      getPollData(data);
      createBar(pollData, data);
      stateMap.call(updateStateFill(currStateSel));
    });
  } else {
    if (pollClick) {
      if (countyClick) {
        mapTitle.text(selRiskString + ' Assessment for ' + selPoll + ' in '+ selCounty + ", " + selState);
      } else {
        mapTitle.text(selRiskString + ' Assessment for ' + selPoll + ' in '+ selStateName);
      }
    } else {
      if (countyClick) {
        mapTitle.text(selRiskString + " Assessment for " + selCounty + ", " + selState);
      } else {
        mapTitle.text(selRiskString + " Assessment for " + selStateName);
      }
    }
  	var riskFile = "../data/CountyData/"  + selRisk + "/" + selRisk + selState + ".csv";

    d3.csv(riskFile, function(error, data) {
      if (error) throw error;
      countyData = data;
      countyAgg = d3.nest()
                    .key(function(d) { return d.fips; })
                    .rollup(function(v) { return {
                      county: d3.max(v, function(d){ return d.county; }),
                      val: d3.mean(v, function(d) { return d.val; }),
                      countyPop: d3.max(v, function(d){ return d.population; })
                    }; })
                    .entries(data);

      dictCounties = {};
      countyAgg.forEach(function(d) {
          dictCounties[d.key] = d;
      });
      d3.select(".bar_chart").select("svg").remove();
      getPollData(data);
      createBar(pollData, data);
      countyMap.call(updateCountyFill(currCountySel));
    });
  }


  // bring up definition
  d3.json("../data/definitions.json", function(error, data){
    //var definition = data.selRisk
    console.log(data[0][selRisk])
    var definitions = document.getElementById('definitions').innerHTML = '</p>'+data[0][selRisk]+'</p>';

    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    span.onclick = function() {
    modal.style.display = "none";
    }

     });

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };



}

//Function to update chloropleth based on pollutant selection
function updatePoll(pollName, data) {
  if (stateView) {
    pollDataFil = stateData.filter(function (d){return d.pollutant==pollName});
    stateAgg = d3.nest()
                  .key(function(d) { return d.id ; })
                  .rollup(function(v) { return {
                  state: d3.max(v, function(d){ return d.state; }),
                  val: d3.mean(v, function(d) { return parseFloat(d.val); }),
                  stateFull: d3.max(v, function(d){ return d.state_name; }),
                  population: d3.max(v, function(d){ return d.population; })
                  }; })
                  .entries(pollDataFil);

    dictStates = {};
    stateAgg.forEach(function(d) {
      dictStates[d.key] = d;
    });
    stateMap.call(updateStateFill(currStateSel));
  } else {
    pollDataFil = countyData.filter(function (d){return d.pollutant==pollName});
    countyAgg = d3.nest()
                  .key(function(d) { return d.fips; })
                  .rollup(function(v) { return {
                    county: d3.max(v, function(d){ return d.county; }),
                    val: d3.mean(v, function(d) { return d.val; }),
                    countyPop: d3.max(v, function(d){ return d.population; })
                  }; })
                  .entries(pollDataFil);

    dictCounties = {};
    countyAgg.forEach(function(d) {
        dictCounties[d.key] = d;
    });
    countyMap.call(updateCountyFill(currCountySel));
  }
}

//Function to reset pollutant selections. Called from the 'Reset Pollutant' button.
function resetPollClick() {
  pollClick = false;
  d3.selectAll("button.poll_reset").style("display", "none");
  d3.selectAll(".mainBars").filter(function(d) {
    return d.key == selPoll;
  }).style("fill", '#0086b3').style('stroke', '#0086b3');
  if (selState.length > 0) {
    mapTitle.text(selRiskString + ' Assessment for ' + selStateName);
  } else {
    mapTitle.text(selRiskString + ' Assessment');
  }
  resetPoll();
}

//Function to reset chloropleth when pollutant selection is cleared
function resetPoll() {
    if (stateView) {
      if (pollClick) {
        pollDataFil = stateData.filter(function (d){return d.pollutant==selPoll});
      } else {
        pollDataFil = stateData;
      }
      stateAgg = d3.nest()
                    .key(function(d) { return d.id ; })
                    .rollup(function(v) { return {
                    state: d3.max(v, function(d){ return d.state; }),
                    val: d3.mean(v, function(d) { return parseFloat(d.val); }),
                    stateFull: d3.max(v, function(d){ return d.state_name; }),
                    population: d3.max(v, function(d){ return d.population; })
                    }; })
                    .entries(pollDataFil);

      dictStates = {};
      stateAgg.forEach(function(d) {
        dictStates[d.key] = d;
      });
      stateMap.call(updateStateFill(currStateSel));
    } else {
      if (pollClick) {
        pollDataFil = countyData.filter(function (d){return d.pollutant==selPoll});
      } else {
        pollDataFil = countyData;
      }
      countyAgg = d3.nest()
                    .key(function(d) { return d.fips; })
                    .rollup(function(v) { return {
                      county: d3.max(v, function(d){ return d.county; }),
                      val: d3.mean(v, function(d) { return d.val; }),
                      countyPop: d3.max(v, function(d){ return d.population; })
                    }; })
                    .entries(pollDataFil);

      dictCounties = {};
      countyAgg.forEach(function(d) {
          dictCounties[d.key] = d;
    });
    countyMap.call(updateCountyFill(currCountySel));
  }
}

//Function for creating the legend and associated text
function showLegend() {
  // Legend
  legendSVG = d3.select(".legend").append("svg")
    .attr("width", legendWidth)
    .attr("height", legendHeight);

  // Low Risk Legend Colors
  legend = legendSVG.append("g")
  .attr("class", "legendG")
  .attr("transform", "translate(370,15)")
  ;

  var legendGreens = d3.legendColor()
  .shapeWidth(20)
  .cells([0,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.4,0.45,0.5])
  .labels(["", "", "", "", "", "", "", "", "", "", ""])
  .labelWrap(30)
  .labelAlign("start")
  .orient('horizontal')
  .shapePadding(0)
  .scale(mapColorGreen);

  legendSVG.select(".legendG")
  .call(legendGreens);

  // Medium Risk Legend Colors
  legend = legendSVG.append("g")
  .attr("class", "legendY")
  .attr("transform", "translate(370,50)")
  ;

  var legendYellows = d3.legendColor()
  .shapeWidth(20)
  .cells([0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1])
  .labels(["", "", "", "", "", "", "", "", "", "", ""])
  .labelWrap(30)
  .labelAlign("start")
  .orient('horizontal')
  .shapePadding(0)
  .scale(mapColorYellow);

  legendSVG.select(".legendY")
  .call(legendYellows);

  // High Risk Legend Colors
  // Red Group1
  legend = legendSVG.append("g")
  .attr("class", "legendR1")
  .attr("transform", "translate(370,85)")
  ;

  var legendReds1 = d3.legendColor()
  .shapeWidth(20)
  .cells([1, 10, 20, 30, 40])
  .labels(["", "", "", "", "", ""])
  .labelWrap(30)
  .labelAlign("start")
  .orient('horizontal')
  .shapePadding(0)
  .scale(mapColorRed1);

  legendSVG.select(".legendR1")
  .call(legendReds1);

  // Red Group2
  legend = legendSVG.append("g")
  .attr("class", "legendR2")
  .attr("transform", "translate(470,85)")
  ;

  var legendReds2 = d3.legendColor()
  .shapeWidth(20)
  .cells([51, 75, 100])
  .labels(["", "", "", ""])
  .labelWrap(30)
  .labelAlign("start")
  .orient('horizontal')
  .shapePadding(0)
  .scale(mapColorRed2);

  legendSVG.select(".legendR2")
  .call(legendReds2);

  // Red Group3
  legend = legendSVG.append("g")
  .attr("class", "legendR3")
  .attr("transform", "translate(530,85)")
  ;

  var legendReds3 = d3.legendColor()
  .shapeWidth(20)
  .cells([132, 164, 195])
  .labels(["", "", "", ""])
  .labelWrap(30)
  .labelAlign("start")
  .orient('horizontal')
  .shapePadding(0)
  .scale(mapColorRed3);

  legendSVG.select(".legendR3")
  .call(legendReds3);

  // No Data
  legendSVG.append("rect")
            .attr("x",370)
            .attr("y",120)
            .attr("width",220)
            .attr("height",20)
            .attr("fill", "grey")

  // Legend Texts
  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 10)
    .attr("x", 440)
    .text("Risk Levels");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 25)
    .attr("x", 309)
    .text("Low Risk");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 42)
    .attr("x", 367)
    .text("0");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 42)
    .attr("x", 470)
    .text("0.25");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 42)
    .attr("x", 579)
    .text("0.49");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 60)
    .attr("x", 290)
    .text("Medium Risk");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 77)
    .attr("x", 367)
    .text("0.5");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 77)
    .attr("x", 470)
    .text("0.75");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 77)
    .attr("x", 585)
    .text("1");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 95)
    .attr("x", 307)
    .text("High Risk");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 112)
    .attr("x", 363)
    .text("1.001");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 112)
    .attr("x", 475)
    .text("98");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 112)
    .attr("x", 579)
    .text("195");

  legendSVG.append("text")
    .attr("class", "legendText")
    .attr("y", 130)
    .attr("x", 260)
    .text("Data Not Available");
}

//Function to control delay for drawing the county level viz on click event for state view
function setCountyLoadStatus() {
  countyLoad = true;
}
