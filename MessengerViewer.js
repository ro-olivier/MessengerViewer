(function(d3) {
  'use strict';

  // SOME PARAMETERS FOR THE GRAPHS LAYOUTS /////

  var chart_width = 360;
  var chart_height = 360;
  var radius = Math.min(chart_width, chart_height) / 2.25;
  var donutWidth = 75;
  var legendRectSize = 18;
  var legendSpacing = 4;

  var slider_width = 300;
  var slider_height = 55;

  var legend_width = 300;
  var legend_height = 360;

  var stacked_width = 720;
  var stacked_height = 320;

  var margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40
    }

  ///////////////////////////////////////////////

  // FUNCTIONS USED TO MANAGE DISPLAY OF DATA ///

  function toggle_participant(name) {

    var rect = d3.select(this);                             
    var enabled = true;                                     
    var totalEnabled = d3.sum(pie_data.map(function(d) {     
      return (d.enabled) ? 1 : 0;                           
    }));    
                                   

    if (rect.attr('class') === 'disabled') {                
      rect.attr('class', '');
      currentTotalEnabled++;                               
    } else {                                                
      if (totalEnabled > 2) {                         
        rect.attr('class', 'disabled');
        d3.select('#activateAllRect').attr('class', 'disabled');                     
        enabled = false;
        currentTotalEnabled--;
      }                                    
    }   

    if (currentTotalEnabled == pie_data.length) {
      d3.select('#activateAllRect').attr('class', ''); 
    }                                                 

    pie.value(function(d) {                                 
      if (d.name === name) d.enabled = enabled;           
      return (d.enabled) ? d.message_count : 0;                     
    });

    pie_char.value(function(d) {                                 
      if (d.name === name) d.enabled = enabled;           
      return (d.enabled) ? d.char_count : 0;                     
    });                                    

    refresh_pie_charts();                                                  
  }

  function toggle_all(name) {

    if (d3.select(this).attr('class') === 'disabled') {
        var rects = d3.selectAll('rect');
        rects.attr('class', '');                          
    } else {                                       
        d3.select(this).attr('class', 'disabled');
    }

    currentTotalEnabled = pie_data.length;

    pie.value(function(d) {
      d.enabled = true;                                 
      return d.message_count;                     
    });

    pie_char.value(function(d) {
      d.enabled = true;                                       
      return d.char_count;                     
    });                                    

    refresh_pie_charts();
  } 

  function hue(dataset, s, h) {
    
    if (s == "max") {
      handle_max.attr("cx", x_pie(h));
      d3.select('#user_input').style("background-color", d3.hsl(h, 0.8, 0.8));
    } else if (s == "min") {
      handle_min.attr("cx", x_pie(h));
      d3.select('#user_input').style("background-color", d3.hsl(h, 0.5, 0.5));
    }

    var cx_min = d3.select("#handle_min").attr("cx");
    var cx_max = d3.select("#handle_max").attr("cx");

    update_date_text(dataset, cx_min, cx_max);
    update_datasets(dataset, cx_min, cx_max);
  }

  function refresh_pie_charts() {

    path_message = path_message.data(pie(pie_data));            

    path_message.transition()                                       
      .duration(750)                                        
      .attrTween('d', compute_tween);  

    path_char = path_char.data(pie_char(pie_data));  

    path_char.transition()                                       
      .duration(750)                                        
      .attrTween('d', compute_tween);
  }

  function update_datasets(dataset, min_, max_) {

    //console.log("attempting to update values");

    var min_index = parseInt(x_pie.invert(min_));
    var max_index = parseInt(x_pie.invert(max_));

    var previous_dataset = pie_data;
    pie_data = dataset[min_index].data;

    pie_data.forEach(function(d) {
      var index = previous_dataset.findIndex(e => e.name == d.name);
      //console.log("index pour " + d.name + ": " + index);
      d.message_count = +d.message_count;
      d.char_count = +d.char_count;
      d.enabled = previous_dataset[index].enabled;
    });

    //console.log(pie_data);

    refresh_pie_charts();
  }

  ///////////////////////////////////////////////

  // OTHER FUNCTIONS ////////////////////////////

  function timeConverter(UNIX_timestamp) {
    
    var a = new Date(UNIX_timestamp * 1000);

    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();

    var time = date + ' ' + month + ' ' + year;
    return time;
  }

  function push_min_back() {
    
    var current_cx = handle_min.attr("cx");
    handle_min.attr("cx", current_cx - 10);
  }

  function push_max_forward() {
    
    var current_cx = handle_max.attr("cx");
    handle_max.attr("cx", parseInt(10) + parseInt(current_cx));
  }

  function update_date_text(dataset, min_, max_) {

    var min_index = parseInt(x_pie.invert(min_));
    var max_index = parseInt(x_pie.invert(max_));

    min_date_text.text("Start date: " + timeConverter(dataset[min_index].timestamp));
    max_date_text.text("End date: " + timeConverter(dataset[max_index].timestamp));
  }

  function show_pie_tooltip(d) {

    var total_message = d3.sum(pie_data.map(function(d) {
      return (d.enabled) ? d.message_count : 0;                       
    }));

    var total_char = d3.sum(pie_data.map(function(d) {
      return (d.enabled) ? d.char_count : 0;                       
    }));

    var percent = Math.round(1000 * d.data.message_count / total_message) / 10;
    tooltip_message.select('.name').html(d.data.name);
    tooltip_message.select('.message_count').html(d.data.message_count);
    tooltip_message.select('.percent').html(percent + '%');
    tooltip_message.style('display', 'block');

    var percent_char = Math.round(1000 * d.data.char_count / total_char) / 10;
    tooltip_char.select('.name').html(d.data.name);
    tooltip_char.select('.char_count').html(d.data.char_count);
    tooltip_char.select('.percent').html(percent_char + '%');
    tooltip_char.style('display', 'block');  
  }

  function hide_pie_tooltip() {
      tooltip_message.style('display', 'none');
      tooltip_char.style('display', 'none');
  }

  function show_stacked_area_tooltip(d) {
    console.log('Received d=' + d);
  }

  function hide_stacked_area_tooltip() {
    return;
  };

  function compute_tween(d) {
    var interpolate = d3.interpolate(this._current, d); 
    this._current = interpolate(0);                     
    return function(t) {                                
      return arc(interpolate(t));                       
    };                                                  
  }

  // OTHER VARIABLES ////////////////////////////
  
  var currentTotalEnabled = 0;

  ///////////////////////////////////////////////

  ///////////////////////////////////////////////

  // The color scheme used for the participants. 
  // Will be used as the "z" axis in the charts. 
  var color = d3.scaleOrdinal(d3.schemeCategory20b);

  // Building the main SVG of each chart.
  var svg_message = d3.select('#message_chart')
    .append('svg')
    .attr('width', chart_width)
    .attr('height', chart_height)
    .append('g')
    .attr('transform', 'translate(' + (chart_width / 2) +
      ',' + (chart_height / 2) + ')');

  var svg_char = d3.select('#char_chart')
    .append('svg')
    .attr('width', chart_width)
    .attr('height', chart_height)
    .append('g')
    .attr('transform', 'translate(' + (chart_width / 2) +
      ',' + (chart_height / 2) + ')');

  var svg = d3.select("#stacked_chart")
    .append('svg')
    .attr("width", stacked_width)
    .attr("height", stacked_height)
  // For the area chart we'll need to access the "g" element instead of the svg element 
  // so we create it separately.
  var g = svg.append('g')
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // D3JS VARIABLES AND FUNCTIONS ///////////////
  // Creating the D3JS pie functions for the donut charts
  var pie = d3.pie()
    .value(function(d) { return d.message_count; })
    .sort(null);

  var pie_char = d3.pie()
    .value(function(d) { return d.char_count; })
    .sort(null);

  var arc = d3.arc()
    .innerRadius(radius - donutWidth)
    .outerRadius(radius);

  var path_message;
  var path_char;

  // Creating the D3JS stack and area functions for the area chart 
  var stack = d3.stack();

  var area = d3.area()
      .x(function(d, i) { return x_stacked(timeConverter(d.data.timestamp)); })
      .y0(function(d) { return y_stacked(d[0]); })
      .y1(function(d) { return y_stacked(d[1]); });

  // This variable will hold the data for the pie charts
  var pie_data;

  // This data will hold the data for the stacked area chart
  var stacked_data; 
  ///////////////////////////////////////////////

  // Creating some additional div for the tooltips (for donuts charts)
  var tooltip_message = d3.select('#message_chart')
    .append('div')
    .attr('class', 'tooltip');

  var tooltip_char = d3.select('#char_chart')
    .append('div')
    .attr('class', 'tooltip');

  tooltip_message.append('div')
    .attr('class', 'name');

  tooltip_message.append('div')
    .attr('class', 'message_count');

  tooltip_message.append('div')
    .attr('class', 'percent');

  tooltip_char.append('div')
    .attr('class', 'name');

  tooltip_char.append('div')
    .attr('class', 'char_count');

  tooltip_char.append('div')
    .attr('class', 'percent');

  ///////////////////////////////////////////////

  // DEFINITING THE AXIS OF THE CHART ///////////
  var x_pie = d3.scaleLinear()
    .range([0, slider_width * 0.8])
    .clamp(true);

  var x_stacked = d3.scaleBand()
    .rangeRound([0, stacked_width])
    .paddingInner(0.05)
    .align(0.1);

  var y_stacked = d3.scaleLinear()
    .rangeRound([stacked_height * 0.8, 0]);

  ///////////////////////////////////////////////

  // ADDING THE USER-INPUT ELEMENTS /////////////

  var user_input = d3.select('#user_input');

  // The slider...
  var slider = user_input.append('svg')
      .attr('width', slider_width)
      .attr('height', slider_height)
      .attr("id", "slider_block")
      .append("g")
      .attr("transform", "translate(30,30)");

  slider.append("line")
      .attr("class", "track")
      .attr("x1", x_pie.range()[0])
      .attr("x2", x_pie.range()[1])
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
      .attr("class", "track-inset")
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
      .attr("class", "track-overlay");

  var handle_max = slider.insert("circle", ".track-overlay")
      .attr("class", "handle")
      .attr("id", "handle_max")
      .attr("r", 9);

  var handle_min = slider.insert("circle", ".track-overlay")
      .attr("class", "handle")
      .attr("id", "handle_min")
      .attr("r", 9)
      .attr("cx", 0);

  // The date display (for readability)
  var dates_display = user_input.append('div')
      .attr("id", "dates_block")
      .append("g")
      .attr("transform", "translate(30," + parseInt(parseInt(30) + parseInt(slider_height)) + ")");

  var min_date_text = d3.select('#dates_block')
    .append("p")
    .append("text");

  var max_date_text = d3.select('#dates_block')
    .append("p")
    .append("text");

  // The legend
  var legend = user_input.append('svg')
      .attr('width', legend_width)
      .attr('height', legend_height)
      .attr("id", "legend_block");

  var legends, activateAll;

  d3.json('data_per_user_per_week.json', function(error, complete_dataset) { 

    pie_data = complete_dataset[0].data;
    currentTotalEnabled = pie_data.length;

    //console.log(pie_data);

    pie_data.forEach(function(d) {
        d.message_count = +d.message_count;
        d.char_count = +d.char_count;
        d.enabled = true;                                         
    });

    x_pie.domain([0, complete_dataset.length - 1]);

    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + -18 + ")")
      .selectAll("text")
      .data(x_pie.ticks(10))
      .enter().append("text")
        .attr("x", x_pie)
        .attr("text-anchor", "middle")
        .text(function(d) { return d; });

    d3.select(".track-overlay")
            .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt(); })
            .on("start drag", function() { 
              //console.log(d3.event.x);

              var cx_min = d3.select("#handle_min").attr("cx");
              var cx_max = d3.select("#handle_max").attr("cx");

              if (parseInt(cx_min) < 0) {
                hue(complete_dataset, "min", x_pie.invert(0));
              }

              //console.log("cx_min = " + cx_min + " and cx_max = " + cx_max);
              
              if ((parseInt(d3.event.x) > parseInt(parseInt(-10) + parseInt(cx_max))) && (parseInt(d3.event.x) < parseInt(parseInt(10) + parseInt(cx_max)))) {
                if (parseInt(d3.event.x) < parseInt(parseInt(10) + parseInt(cx_min))) {
                  push_min_back();
                  //console.log("Max got too close to min, pushing min");
                } else {
                hue(complete_dataset, "max", x_pie.invert(d3.event.x));
                console.log("Moving max handle");
                }
              }

              cx_min = d3.select("#handle_min").attr("cx");
              cx_max = d3.select("#handle_max").attr("cx");
              //console.log("cx_min = " + cx_min + " and cx_max = " + cx_max);

              if ((parseInt(d3.event.x) > parseInt(parseInt(-10) + parseInt(cx_min))) && (parseInt(d3.event.x) < parseInt(parseInt(10) + parseInt(cx_min)))) {
                if (parseInt(d3.event.x) > parseInt(parseInt(-10) + parseInt(cx_max))) {
                  push_max_forward();
                  //console.log("Min got too close to max, pushing max");
                } else {
                hue(complete_dataset, "min", x_pie.invert(d3.event.x));
                console.log("Moving min handle");
                }
              }

              //console.log("Value for min = " + parseInt(x_pie.invert(cx_min)));
              //console.log("Value for max = " + parseInt(x_pie.invert(cx_max)));
            }));

    slider.transition() // Gratuitous intro!
        .duration(750)
        .tween("hue", function() {
          var i = d3.interpolate(0, x_pie.range()[1]);
          return function(t) { hue(complete_dataset, "max", i(t)); };
        });

    path_message = svg_message.selectAll('path')
      .data(pie(pie_data))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', function(d, i) {
        return color(d.data.name);
      })                                                        
      .each(function(d) { this._current = d; });                

    path_message.on('mouseover', show_pie_tooltip);
    path_message.on('mouseout', hide_pie_tooltip);

    path_char = svg_char.selectAll('path')
      .data(pie_char(pie_data))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', function(d, i) {
        return color(d.data.name);
      })                                                        
      .each(function(d) { this._current = d; });                

    path_char.on('mouseover', show_pie_tooltip);
    path_char.on('mouseout', hide_pie_tooltip);

    // Setting the details of the legend.
    legends = legend.selectAll('.legend')
        .data(color.domain())
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
          var height = legendRectSize + legendSpacing;
          var vert = i * height;
          return 'translate(60,' + vert + ')';
        });

    legends.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)
      .style('fill', color)
      .style('stroke', color)                                
      .on('click', toggle_participant);                                                       

    legends.append('text')
      .attr('x', legendRectSize + legendSpacing)
      .attr('y', legendRectSize - legendSpacing)
      .text(function(d) { return d; });

    activateAll = legend.append('g')
      .attr('class', 'legend');

    activateAll.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)
      .style('fill', color)
      .style('stroke', color)
      .attr('id', 'activateAllRect')                                   
      .on('click', toggle_all);    

    activateAll.append('text')
      .attr('x', legendRectSize + legendSpacing)
      .attr('y', legendRectSize - legendSpacing)
      .text("Activate all");

    activateAll.attr('transform', function(d, i) {
      var height = legendRectSize + legendSpacing;
      var vert = (pie_data.length - 1) * height * 1.2;
      return 'translate(60,' + vert + ')';
    });


  });

  d3.json('stacked_messages.json', function(error, complete_dataset) {

    var data = complete_dataset.slice(0,complete_dataset.length );

    var keys = Object.keys(complete_dataset[0]);
    keys.splice(keys.indexOf("timestamp"), 1);

    data.forEach(function(d){
      d.total = 0;
      keys.forEach(function(k){
        d.total += d[k];
      })
    });
    
    stack.keys(keys);


    x_stacked.domain(data.map(function(d) {
      return timeConverter(d.timestamp);
    }));
    y_stacked.domain([0, d3.max(data, function(d) {
      return d.total;
    })]).nice();
    color.domain(keys);

    var layer = g.selectAll(".layer")
      .data(stack(data))
      .enter().append("g")
        .attr("class", "layer");

    layer.append("path")
        .attr("class", "area")
        .style("fill", function(d) { return color(d.key); })
        .attr("d", area);

    layer.on('mouseover', show_stacked_area_tooltip);
    layer.on('mouseout', hide_stacked_area_tooltip);

    var x_axis = g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + stacked_height * 0.8 + ")")
      .call(d3.axisBottom(x_stacked))
      .selectAll('text')
      .attr("transform", "rotate(-90) translate(-42,-12.5)");

    var tick_text = x_axis.selectAll('text').attr("y", 20);

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y_stacked).ticks(null, "s"))
      .append("text")
      .attr("x", 2)
      .attr("y", y_stacked(y_stacked.ticks().pop()) + 0.5)
      .attr("dy", "0.32em")
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "start");
  });

})(window.d3);