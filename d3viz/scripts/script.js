var margin = {
    top: 10,
    bottom: 10,
    left: 10,
    right:10
}, width = parseInt(d3.select('.viz').style('width'))
    , width = width - margin.left - margin.right
    , mapRatio = 0.5
    , height = width * mapRatio
    , active = d3.select(null);

var fmt = d3.format(" >5.2%")
    errorCount = 0;;

var svg = d3.select('.viz').append('svg')
    .attr('class', 'center-container')
    .attr('height', height + margin.top + margin.bottom)
    .attr('width', width + margin.left + margin.right);

svg.append('rect')
    .attr('class', 'background center-container')
    .attr('height', height + margin.top + margin.bottom)
    .attr('width', width + margin.left + margin.right)
    .on('click', clicked);

  var color = d3.scaleSequential(d3.interpolateBlues)

  var projection = d3.geoAlbersUsa()
      .translate([width /2 , height / 2])
      .scale(width);

  var path = d3.geoPath()
      .projection(projection);

  var g = svg.append("g")
      .attr('class', 'center-container center-items us-state')
      .attr('transform', 'translate('+margin.left+','+margin.top+')')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)

  function ready(error, us, data) {
    if (error) throw error;

    // console.log(data);
    var countyAgg = d3.nest()
    .key(function(d) { return d.state + d.county; })
    .rollup(function(v) { return {
      count: v.length,
      state_id: d3.max(v, function(d){ return parseInt(d.id); }),
      fips: d3.max(v, function(d){ return parseInt(d.fips); }),
      population: d3.max(v, function(d){ return d.population; }),
      totRisk: d3.mean(v, function(d) { return d.totrisk; }),
      risk1: d3.mean(v, function(d) { return d.risk1; })
    }; })
    .entries(data);
    // console.log(JSON.stringify(countyAgg));

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
      totRisk: d3.mean(v, function(d) { return parseFloat(d.value.totRisk); }),
      risk1: d3.mean(v, function(d) { return parseFloat(d.value.risk1); })
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
    color.domain([
      d3.min(stateAgg, function(d) { return d.value.totRisk; }),
      d3.max(stateAgg, function(d) { return d.value.totRisk; })
    ]);

    g.append("g")
        .attr("id", "counties")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "county-boundary")
        .on("click", reset)
        .style("fill", function(d) {
          // console.log(d);
          console.log(d.id, dictCounties[d.id]);
          var county_fip = dictCounties[d.id];
          if (county_fip)
              return color(county_fip.value.totRisk);
          else {
              errorCount++;
              console.log(d.id + " Not found" + " errors = " + errorCount);
              return color(0);
          }
        })
        .attr("d", path)
        .append("title")
        .text(function(d) {
          var county_fip = dictCounties[d.id];
            if (county_fip) {
              var county = county_fip.county,
                  state = county_fip.state,
                  value = county_fip.value.totRisk,
                  msg = county + ', ' + state + "; Total Risk: " + fmt(value);
            }
            return msg;
        });

    g.append("g")
          .attr("id", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
         .enter()
         .append("path")
         .attr("d", path)
         .attr("class", "state")
         .on("click", clicked)
         .style("fill", function(d) {
           // console.log(d);
           // console.log(d.id, dictStates[d.id].value.totRisk);
            var value = dictStates[d.id].value.totRisk;

            if (value) {
              return color(value);
            } else {
              return color(0);
            }
         })
         .attr("d", path)
         .append("title")
         .text(function(d) {
             var value = dictStates[d.id].value.totRisk,
                 state = dictStates[d.id].key;

             if (value) {var msg = state + "; Total Risk: " + fmt(value);
             }
             return msg;
         });
}


// Load multiple files at once
d3.queue()
    // .defer(d3.json, "../data/us-states.json")
    .defer(d3.json, "../data/us-counties.topojson")
    .defer(d3.json, "../data/alldata.json")
    .await(ready);

    function clicked(d) {
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
        active.classed("active", false);
        active = d3.select(null);

        g.transition()
            .delay(100)
            .duration(750)
            .style("stroke-width", "1.5px")
            .attr('transform', 'translate('+margin.left+','+margin.top+')');

    }
