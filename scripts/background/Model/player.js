define([
	'backbone'
], function(Backbone){
	
	var Player = Backbone.Model.extend({
		defaults: {
			slider: null,
			currentSong: null,
			duration: 0,
			state: false,
			source: null,
			time: 0
		},
		
		initialize: function(){
			window.AudioContext = window.AudioContext || window.webkitAudioContext;
			window.context = new window.AudioContext();
		},
		
		playCurrentSong: function(){
			var self = this;
			var song = this.get('currentSong');
			var source = window.context.createBufferSource();
			var currentTime = this.get('time');
			if (!song.get('buffer')) 
				return;
			console.log(currentTime);
			source.buffer = song.get('buffer');
			this.set('duration', source.buffer.duration);
			source.connect(context.destination);
			self.set('state', true);
			self.set('source', source);
			source.start(context.currentTime, currentTime);
			interval = setInterval(function(){
				++currentTime;
				self.set('time', currentTime);
			}, 1000);
			
		},
		
		pauseCurrentSong: function(){
			if (!this.get('source')) return undefined;
			this.get('source').stop();
			clearInterval(interval);
		}
	});
	
	return Player;
});