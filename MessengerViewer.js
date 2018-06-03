var initial_end = 0;

var svg = d3.select("svg"),
    margin = {top: 20, right: 20, bottom: 390, left: 60},
    margin2 = {top: 430, right: 20, bottom: 300, left: 60},
    margin3 = {top: 640, right: 20, bottom: 20, left: 60},
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    height2 = +svg.attr("height") - margin2.top - margin2.bottom,
    height3 = +svg.attr("height") - margin3.top - margin3.bottom;

var radius = 100;
var donutWidth = 45;

var legendRectSize = 18;
var legendVerticalSpacing = 4;
var legendHorizontalSpacing = 150;
var legendMaxItemOnColumn = 6;

var legend_vertical_offset = +margin3.top - +radius ;

var donut_lateral_offset = +margin3.left + +(3 * width / 4)
var tooltip_lateral_offset = 2*margin3.left + +(3 * width / 4) + radius;
var tooltip_vertical_offset = +margin3.top - radius / 2;

var tooltip_height = 100;
var tooltip_width = 100;
var tooltip_text_size = 12;

var tooltip_element_vertical_offset = +tooltip_vertical_offset + +(tooltip_height / 2);
var tooltip_vertical_spacing = 20;
var tooltip_element_vertical_offset_negative = +tooltip_element_vertical_offset - tooltip_vertical_spacing;
var tooltip_element_vertical_offset_positive = +tooltip_element_vertical_offset + +tooltip_vertical_spacing;

var button_height = 30;
var button_width = 100;
var button_padding = 5;
var button_text_size = 12;
var button_lateral_offset = 2*margin3.left + +(width / 2) - radius;
var button_vertical_offset = legend_vertical_offset ;
var second_button_vertical_offset = button_vertical_offset + button_height + button_padding;

var color = d3.scaleOrdinal(d3.schemeCategory20b);
var keys;

var x = d3.scaleTime().range([0, width]),
    x2 = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    y2 = d3.scaleLinear().range([height2, 0]);

var xAxis = d3.axisBottom(x),
    xAxis2 = d3.axisBottom(x2),
    yAxis = d3.axisLeft(y);

var min_timestamp;
var max_timestamp;

var currentTotalEnabled;
var enabledParticipants = {};

var brush = d3.brushX()
    .extent([[0, 0], [width, height2]])
    .on("brush end", brushed);

var zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]])
    .on("zoom", zoomed);

var stack_message = d3.stack()
    .value(function(d, key) {
      return enabledParticipants[key] ? d[key].messages : 0;
    });

var stack_char = d3.stack()
    .value(function(d, key) {
      return enabledParticipants[key] ? d[key].chars : 0;
    });

var area = d3.area()
    .curve(d3.curveMonotoneX)
    .x(function(d, i) { return x(new Date(d.data.timestamp * 1000)); })
    .y0(function(d) { return y(d[0]); })
    .y1(function(d) { return y(d[1]); });

var area2 = d3.area()
    .curve(d3.curveMonotoneX)
    .x(function(d) { return x2(new Date(d.timestamp * 1000)); })
    .y0(height2)
    .y1(function(d, i) { 
      if (data_type === 'messages') {
        return y2(d.total_message); 
      } else {
        return y2(d.total_char);
      };
    });

var current_layer;
var new_layer;

var stacked_data;
var context_stacked_data = [];

var pie = d3.pie()
  .value(function(d) { return d.count; })
  .sort(null);

var arc = d3.arc()
  .innerRadius(radius - donutWidth)
  .outerRadius(radius);

var path;

svg.append("defs").append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("width", width)
    .attr("height", height);

var focus = svg.append("g")
    .attr("class", "focus")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var context = svg.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

var donut = svg.append("g")
    .attr("class", "donut")
    .attr("transform", "translate(" + donut_lateral_offset + "," + margin3.top + ")");

var legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + margin3.left + "," + legend_vertical_offset + ")");

var legends;

var activateAll_vertical_offset = (1.05) * (+legend_vertical_offset + legendMaxItemOnColumn*(legendRectSize + legendVerticalSpacing));
var activateAll = svg.append("g")
    .attr("class", "activateAll")
    .attr("transform", "translate(" + margin3.left + "," + activateAll_vertical_offset + ")");

activateAll.append('rect')
  .attr('width', legendRectSize)
  .attr('height', legendRectSize)
  .style('fill', '#843C39')
  .style('stroke', '#843C39')
  .attr('id', 'activateAllRect')                                
  .on('click', toggle_all);

activateAll.append('text')
  .attr('x', legendRectSize + legendVerticalSpacing)
  .attr('y', legendRectSize - legendVerticalSpacing)
  .text("Activate all");

var tooltip = svg.append("g")
  .attr("class", "tooltip");

var tooltip_rect = tooltip.append("rect")
  .attr("height", tooltip_height)
  .attr("width", tooltip_width)
  .style('fill', 'white')
  .attr("transform", "translate(" + tooltip_lateral_offset + "," + tooltip_vertical_offset + ")");

var name = tooltip.append('text')
  .attr('class', 'name')
  .attr('fill', 'black')
  .attr('font-size', tooltip_text_size)
  .attr("transform", "translate(" + +tooltip_lateral_offset + "," + tooltip_element_vertical_offset_negative + ")");

var count = tooltip.append('text')
  .attr('class', 'count')
  .attr('fill', 'black')
  .attr('font-size', tooltip_text_size)
  .attr("transform", "translate(" + +tooltip_lateral_offset + "," + +tooltip_element_vertical_offset + ")");

var percent = tooltip.append('text')
  .attr('class', 'percent')
  .attr('fill', 'black')
  .attr('font-size', tooltip_text_size)
  .attr("transform", "translate(" + +tooltip_lateral_offset + "," + tooltip_element_vertical_offset_positive + ")");


var button_data = [{label: "Messages view", x: button_lateral_offset, y: button_vertical_offset },
        {label: "Characters view", x: button_lateral_offset, y: second_button_vertical_offset }];

var button = d3.button()
    .on('press', function(d,i) { toggle_data_type(); })
    .on('release', function(d, i) { return; });

var buttons = svg.selectAll('.button')
    .data(button_data)
    .enter()
    .append('g')
    .attr('class', 'toggle_data_type_button')
    .call(button);

buttons.selectAll('rect')
    .attr('height', button_height)
    .attr('width', button_width);

var data_type;

//d3.json('stacked_messages.json', function(error, data) {
d3.json('stacked.json', function(error, data) {
  if (error) throw error;

  data_type = 'messages';
  d3.select('#d3-button0').select('rect').attr('class', 'pressed');

  initial_end = data.length;

  keys = Object.keys(data[0]);
  keys.splice(keys.indexOf("timestamp"), 1);
  keys.sort();

  currentTotalEnabled = keys.length;

  color.domain(keys);
  stack_message.keys(keys);
  stack_char.keys(keys);

  keys.forEach(function (d) {
    enabledParticipants[d] = true;
  });

  stacked_data = data.slice(0, initial_end);
  
  min_timestamp = d3.min(stacked_data.map(function(d) { return d.timestamp;}));
  max_timestamp = d3.max(stacked_data.map(function(d) { return d.timestamp;}));

  x.domain([new Date(min_timestamp * 1000), new Date(max_timestamp * 1000)]);
  x2.domain(x.domain());

  cumul_data_messages = {};
  cumul_data_chars = {};

  stacked_data.forEach(function(d, i){
    d.total_message = 0;
    d.total_char = 0;

    if (Object.keys(cumul_data_messages).length == 0) {
      keys.forEach(function(k){
        d.total_message = +d[k].messages;
        d.total_char = +d[k].chars;
        cumul_data_messages[k] = +d[k].messages;
        cumul_data_chars[k] = +d[k].chars;
      });
    } else {
    //d.timestamp = d['timestamp'];
      keys.forEach(function(k){
        d.total_message += +d[k].messages;
        d.total_char += +d[k].chars;
        cumul_data_messages[k] += +d[k].messages;
        cumul_data_chars[k] += +d[k].chars;
      });
    }

    context_stacked_data[i] = {'timestamp': d.timestamp,
                                'total_message': d.total_message, 
                                'total_char': d.total_char };
  });

  cumul_data_pie_messages_ = transform(cumul_data_messages, keys);
  cumul_data_pie_messages = applyEnabledParticipant(cumul_data_pie_messages_);
  //console.log('cumul_data_messages=' + JSON.stringify(cumul_data_messages));
  //console.log('cumul_data_pie_messages_=' + JSON.stringify(cumul_data_pie_messages_)); 
  //console.log('cumul_data_pie_messages=' + JSON.stringify(cumul_data_pie_messages)); 

  cumul_data_pie_chars_ = transform(cumul_data_chars, keys);
  cumul_data_pie_chars = applyEnabledParticipant(cumul_data_pie_chars_);
  //console.log('cumul_data_chars=' + JSON.stringify(cumul_data_chars));
  //console.log('cumul_data_pie_chars_=' + JSON.stringify(cumul_data_pie_chars_)); 
  //console.log('cumul_data_pie_chars=' + JSON.stringify(cumul_data_pie_chars)); 

  y.domain([0, d3.max(stacked_data, function(d) { return d.total_message; })]).nice();
  y2.domain(y.domain());

  current_layer = stack_message(stacked_data);

  focus.selectAll(".area")
    .data(current_layer)
    .enter()
    .append("path")
    .attr("d", area)
    .attr("class", "area")
    .style("fill", function(d) { return color(d.key); });

  focus.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  focus.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

  context.append("path")
      .datum(context_stacked_data)
      .attr("class", "area")
      .attr("d", area2);

  context.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);

  context.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, x.range());

  svg.append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoom);

  path = donut.selectAll('path')
  .data(pie(cumul_data_pie_messages))
  .enter()
  .append('path')
  .attr('d', arc)
  .attr('fill', function(d) { return color(d.data.name)})                                            
  .each(function(d) { this._current = d; });

  path.on('mouseover', show_pie_tooltip);
  path.on('mouseout', hide_pie_tooltip);


  legends = legend.selectAll('.legend')
      .data(color.domain())
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) {
        var vert = (i % legendMaxItemOnColumn) * (legendRectSize + legendVerticalSpacing);
        var hor = (parseInt(i / legendMaxItemOnColumn) * legendHorizontalSpacing);
        return 'translate(' + hor + ',' + vert + ')';
      });

  legends.append('rect')
    .attr('width', legendRectSize)
    .attr('height', legendRectSize)
    .style('fill', color)
    .style('stroke', color)                                        
    .on('click', toggle_participant);

  legends.append('text')
    .attr('x', legendRectSize + legendVerticalSpacing)
    .attr('y', legendRectSize - legendVerticalSpacing)
    .text(function(d) { return d; });

});

function brushed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; 
  // ignore brush-by-zoom
  console.log('starting brushed method');
  var s = d3.event.selection || x2.range();

  x.domain(s.map(x2.invert, x2));

  focus.selectAll(".area").attr("d", area);
  focus.select(".axis--x").call(xAxis);
  svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
      .scale(width / (s[1] - s[0]))
      .translate(-s[0], 0));

  if (data_type === 'messages') {
    cumul_data_messages = {};

    stacked_data.forEach(function(d, i){
      d.total_message = 0;

      if ((d.timestamp * 1000) >= s.map(x2.invert, x2)[0].getTime() && 
        (d.timestamp * 1000) <= s.map(x2.invert, x2)[1].getTime()) {

      if (Object.keys(cumul_data_messages).length == 0) {
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] = d[k].messages;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] += d[k].messages;
            });
        } 
      }
    });

    cumul_data_pie_messages_ = transform(cumul_data_messages, keys);
    cumul_data_pie_messages = applyEnabledParticipant(cumul_data_pie_messages_);

    path = donut.selectAll('path')
    .data(pie(cumul_data_pie_messages));  
  } else {
    cumul_data_chars = {};

    stacked_data.forEach(function(d, i){
      d.total_char = 0;

      if ((d.timestamp * 1000) >= s.map(x2.invert, x2)[0].getTime() && 
        (d.timestamp * 1000) <= s.map(x2.invert, x2)[1].getTime()) {

      if (Object.keys(cumul_data_chars).length == 0) {
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] = d[k].chars;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] += d[k].chars;
            });
        } 
      }
    });

    cumul_data_pie_chars_ = transform(cumul_data_chars, keys);
    cumul_data_pie_chars = applyEnabledParticipant(cumul_data_pie_chars_);

    path = donut.selectAll('path')
    .data(pie(cumul_data_pie_chars));   
  } 

  path.transition()                                       
    .duration(750)                                        
    .attrTween('d', compute_tween_arc);  

}

function zoomed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; 
  // ignore zoom-by-brush
  console.log('starting zoomed method');
  var t = d3.event.transform;
  x.domain(t.rescaleX(x2).domain());
  focus.selectAll(".area").attr("d", area);
  focus.select(".axis--x").call(xAxis);
  context.select(".brush").call(brush.move, x.range().map(t.invertX, t));

  if (data_type === 'messages') {
    cumul_data_messages = {};

    stacked_data.forEach(function(d, i){
      d.total_message = 0;

      if ((d.timestamp * 1000) >= x.domain()[0].getTime() && 
          (d.timestamp * 1000) <= x.domain()[1].getTime()) {

      if (Object.keys(cumul_data_messages).length == 0) {
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] = d[k].messages;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] += d[k].messages;
            });
        } 
      }
    });

    cumul_data_pie_messages_ = transform(cumul_data_messages, keys);
    cumul_data_pie_messages = applyEnabledParticipant(cumul_data_pie_messages_);

    path = donut.selectAll('path')
    .data(pie(cumul_data_pie_messages));
  } else {
    cumul_data_chars = {};

    stacked_data.forEach(function(d, i){
      d.total_char = 0;

      if ((d.timestamp * 1000) >= x.domain()[0].getTime() && 
          (d.timestamp * 1000) <= x.domain()[1].getTime()) {

      if (Object.keys(cumul_data_chars).length == 0) {
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] = d[k].chars;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] += d[k].chars;
            });
        } 
      }
    });

    cumul_data_pie_chars_ = transform(cumul_data_chars, keys);
    cumul_data_pie_chars = applyEnabledParticipant(cumul_data_pie_chars_);

    path = donut.selectAll('path')
    .data(pie(cumul_data_pie_chars));
  }

  path.transition()                                       
    .duration(750)                                        
    .attrTween('d', compute_tween_arc);  



  if (data_type === 'messages') {
    y.domain([0, d3.max(stacked_data, function(d) { return d.total_message; })]).nice();
    new_layer = stack_message(stacked_data);
  } else {
    y.domain([0, d3.max(stacked_data, function(d) { return d.total_char; })]).nice();
    new_layer = stack_char(stacked_data);
  }

  y2.domain(y.domain());
  d3.select('.axis--y')
    .transition()
    .duration(750)
    .call(d3.axisLeft(y));

  var t;
  focus.selectAll(".area")
    .data((t = new_layer, new_layer = current_layer, current_layer = t))
    .transition()
    .duration(750)
    .attr('d', area);
}

function transform(targetObj, keyArray) {
    let resultArray = [];
    
    if (!targetObj || !keyArray) { return resultArray; }
    
    for (let i = 0; i < keyArray.length; i++) {
        if (!targetObj.hasOwnProperty(keyArray[i])) { continue; }     
        let item = {};
        item['name'] = keyArray[i]; 
        item['count'] = targetObj[keyArray[i]];
        resultArray.push(item);
    }

    return resultArray;   
}

function applyEnabledParticipant(ar) {
  let resultArray = [];

  for (var i = 0; i < ar.length; i++) {
    let item = ar[i];

    if (enabledParticipants[ar[i].name]) {
      item['enabled'] = true;
    } else {
      item['enabled'] = false;
    }
    resultArray.push(item);
  }

  return resultArray;
}

function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}

function compute_tween_arc(d) {
  var interpolate = d3.interpolate(this._current, d); 
  this._current = interpolate(0);                     
  return function(t) {                                
    return arc(interpolate(t));                       
  };                                                  
}

function show_pie_tooltip(d) {

  if (data_type === 'messages') {
    var total_message = d3.sum(cumul_data_pie_messages.map(function(d) {
      return (d.enabled) ? d.count : 0;
    }));

    var percent = Math.round(1000 * d.data.count / total_message) / 10;
    tooltip.select('.name').html(d.data.name);
    tooltip.select('.count').html(d.data.count + ' messages');
    tooltip.select('.percent').html(percent + '% of ' + total_message);
    tooltip.style('display', 'block');
  } else {
    var total_char = d3.sum(cumul_data_pie_chars.map(function(d) {
      return (d.enabled) ? d.count : 0;
    }));

    var percent = Math.round(1000 * d.data.count / total_char) / 10;
    tooltip.select('.name').html(d.data.name);
    tooltip.select('.count').html(d.data.count + ' chars');
    tooltip.select('.percent').html(percent + '% of ' + total_char);
    tooltip.style('display', 'block');
  }

}

function hide_pie_tooltip() {
    tooltip.style('display', 'none');
}

function toggle_participant(name) {

  var rect = d3.select(this);                             
  var enabled = true;                       
  var totalEnabled = d3.sum(cumul_data_pie_messages.map(function(d) { 
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

  if (currentTotalEnabled == keys.length) {
    d3.select('#activateAllRect').attr('class', ''); 
  }  

  enabledParticipants[name] = enabled;

  if (data_type === 'messages') {
    applyEnabledParticipant(cumul_data_pie_messages);

    pie.value(function(d) {                                 
      if (d.name === name) d.enabled = enabled;           
      return (d.enabled) ? d.count : 0;                     
    });                                 

    path = donut.selectAll('path')
      .data(pie(cumul_data_pie_messages));   

    new_layer = stack_message(stacked_data);
  } else {
    applyEnabledParticipant(cumul_data_pie_chars);

    pie.value(function(d) {                                 
      if (d.name === name) d.enabled = enabled;           
      return (d.enabled) ? d.count : 0;                     
    });                                 

    path = donut.selectAll('path')
      .data(pie(cumul_data_pie_chars));   

    new_layer = stack_char(stacked_data);
  }

  path.transition()                                       
    .duration(750)                                        
    .attrTween('d', compute_tween_arc);

  var t;
  focus.selectAll(".area")
    .data((t = new_layer, new_layer = current_layer, current_layer = t))
    .transition()
    .duration(750)
    .attr('d', area);                               
}

function toggle_all(){
                        
  var enabled = true;             

  if (d3.select(this).attr('class') === 'disabled') {
      var rects = d3.select('.legend').selectAll('rect');
      rects.attr('class', '');
      d3.select(this).attr('class', '');                       
  } 
  //else {
  //    enabled = false;                                    
  //    d3.select(this).attr('class', 'disabled');
  //  }

  keys.forEach(function(k) {
    enabledParticipants[k] = enabled;
  });

  if (data_type === 'messages') {
    applyEnabledParticipant(cumul_data_pie_messages);

    pie.value(function(d) {                                 
      if (d.name === name) d.enabled = enabled;           
      return (d.enabled) ? d.count : 0;                     
    });                                 

    path = donut.selectAll('path')
      .data(pie(cumul_data_pie_messages));   

    new_layer = stack_message(stacked_data);
  } else {
    applyEnabledParticipant(cumul_data_pie_chars);

    pie.value(function(d) {                                 
      if (d.name === name) d.enabled = enabled;           
      return (d.enabled) ? d.count : 0;                     
    });                                 

    path = donut.selectAll('path')
      .data(pie(cumul_data_pie_chars));   

    new_layer = stack_char(stacked_data);
  }

  path.transition()                                       
    .duration(750)                                        
    .attrTween('d', compute_tween_arc);    

  var t;
  focus.selectAll(".area")
    .data((t = new_layer, new_layer = current_layer, current_layer = t))
    .transition()
    .duration(750)
    .attr('d', area);
  }

function toggle_data_type() {

  stacked_data.forEach(function(d, i){
    d.total_char = 0;
    d.total_message = 0;

    if ((d.timestamp * 1000) >= x.domain()[0].getTime() && 
        (d.timestamp * 1000) <= x.domain()[1].getTime()) {

    if (Object.keys(cumul_data_chars).length == 0) {
          keys.forEach(function(k){
            d.total_char += d[k].chars;
            d.total_message += d[k].messages;
          });
        } else {
        //d.timestamp = d['timestamp'];
          keys.forEach(function(k){
            d.total_char += d[k].chars;
            d.total_message += d[k].messages;
          });
      } 
    }
  });

  if (data_type === 'messages') {
    data_type = 'chars'
    console.log('switching to chars');

    y.domain([0, d3.max(stacked_data, function(d) { return d.total_char; })]).nice();
    y2.domain([0, d3.max(context_stacked_data, function(d) { return d.total_char; })]).nice();
    console.log('New y-axis domain: '+ y.domain());

    path = donut.selectAll('path')
    .data(pie(cumul_data_pie_chars));   

    new_layer = stack_char(stacked_data);

    console.log('switched to chars');
    clear_buttons();
  } else {
    data_type = 'messages'
    console.log('switching to messages');

    y.domain([0, d3.max(stacked_data, function(d) { return d.total_message; })]).nice();
    y2.domain([0, d3.max(context_stacked_data, function(d) { return d.total_message; })]).nice();
    console.log('New y-axis domain: '+ y.domain());

    path = donut.selectAll('path')
    .data(pie(cumul_data_pie_messages));   

    new_layer = stack_message(stacked_data);

    console.log('switched to messages');
    clear_buttons();
  }

  d3.select('.axis--y')
    .transition()
    .duration(750)
    .call(d3.axisLeft(y));

  path.transition()                                       
    .duration(750)                                        
    .attrTween('d', compute_tween_arc);

  var t;
  focus.selectAll(".area")
    .data((t = new_layer, new_layer = current_layer, current_layer = t))
    .transition()
    .duration(750)
    .attr('d', area);

  context.selectAll('.area')
    .datum(context_stacked_data)
    .transition()
    .duration(750)
    .attr('d', area2);

  function clear_buttons() {
    buttons.selectAll('rect')
        .each(function(d, i) { button.clear.call(this, d, i) });
  }
}