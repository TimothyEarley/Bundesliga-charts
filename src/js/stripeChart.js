Chart.defaults.stripe = Chart.helpers.clone(Chart.defaults.line);
Chart.controllers.stripe = Chart.controllers.line.extend({
  draw: function(ease) {
    var result = Chart.controllers.line.prototype.draw.call(this, arguments);

    var meta = this.getMeta();
		var ctx = this.chart.chart.ctx;
		var yScale = this.getScaleForId(meta.yAxisID);
		var yScaleZeroPixel = yScale.getPixelForValue(0);
		var widths = this.getDataset().width;

    if (toggle3) {
      ctx.save();
  		ctx.fillStyle = this.getDataset().backgroundColor;
  		ctx.lineWidth = 1;
  		ctx.beginPath();

  		const start = meta.data[0];
  		ctx.moveTo(start.x, start.y);
  		// above line
  		Chart.helpers.each(meta.data, (point, index) => {
  			const offset = yScale.getPixelForValue(widths[index]) - yScaleZeroPixel;
  			ctx.lineTo(point._view.x, point._view.y + offset);
  		});
  		// below line
  		meta.data.reverse();
  		Chart.helpers.each(meta.data, (point, index) => {
  			const offset = yScale.getPixelForValue(widths[index]) - yScaleZeroPixel;
  			ctx.lineTo(point._view.x, point._view.y); // add offset for below line, otherwise it is just above
  		});
  		meta.data.reverse();

  		ctx.closePath();
  		ctx.fill();

      ctx.restore();
    }

    return result;
  }
});
