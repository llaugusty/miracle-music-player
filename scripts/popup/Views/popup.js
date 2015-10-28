define(['underscore', 
		'backbone',
		'text!/templates/popup_template.html',
		'jquery',
		'moment',
		'player',
		'songModel'
], function(_, Backbone, Html, $, Moment, Player, Song){
	var PopupView = Backbone.View.extend({
		popupTemplate: _.template(Html),
		
		events: {
			"click .fui-play" : "onResume",
			"click .fui-pause" : "onPause",
			"change #search-query-3": "searchQuery",
			"click .musicSearch": "selectSong"
		},
		
		initialize: function(){
			this.bg = chrome.extension.getBackgroundPage();
			this.bg.player.on('change', this.renderTime, this);
			this.render();
			this.renderTime();
			window.bg = this.bg;
		},
		
		el: '#main-container',
		
		render: function(){
			var self = this;
			this.$el.html(this.popupTemplate());	
			$('#slider', this.el).slider({min: 0, max: 100, value: 0, range: "min",
				change: function( event, ui ) {
					if (event.altKey === false && self.bg.player.audio && self.bg.player.audio.duration){
						self.bg.player.audio.currentTime = self.bg.player.audio.duration * ui.value / 100;
						console.log(self.bg.player.audio.duration * ui.value / 100);
					}
				}							 
			});
			$('#search-area').hide();
			$('#btn-search').click(function(){
				$('#search-area').slideToggle();
			});
		},
		
		renderTime: function(){
			var duration = 0;
			var time = 0;
			var title = "Have fun ^_^!";
			var player = this.bg.player;
			
			if (player.audio && player.audio.ended)
				player.audio.timeCurrent = 0;
			
			if (player.audio && player.audio.duration !== NaN)
				duration = player.audio.duration;
			
			if (player.audio)
				time = player.audio.currentTime;
			
			if (player.get('currentSong')){
				var songTitle = player.get('currentSong').get('Title');
				var artist = player.get('currentSong').get('Artist');
				songTitle = this.shorter(songTitle, 35 - artist.length);
				title = songTitle + ' - ' + artist;
			}
			
			console.log(title);
			
			if (duration !== 0 && duration === time){
				player.audio.currentTime = 0;
				player.pauseCurrentSong();
			}
			
			if (duration !== 0)
				$('#slider', this.el).slider({ value: time * 100 / duration });
			
			if (player.audio && player.audio.ended)
				$('#slider', this.el).slider({ value: time * 100 / duration });
			
			$('#time', this.el).html( Moment().startOf('day').seconds(time).format('mm:ss') );
			
			$('#song-title', this.el).html(title);
			
			if (player.get('state')) this.btnPause();
			else this.btnPlay();
			
		},
		
		selectSong: function(e){
			var nth = e.currentTarget.getAttribute('data-nth');
			var data = this.searchList[nth];
			var bg = chrome.extension.getBackgroundPage();
			bg.player.pauseCurrentSong();
			bg.player.selectSong(data).playCurrentSong();
			this.btnPause();
		},
		
		toPascalCase: function(str) {
			var arr = str.trim().split(/\s|_/);
			for(var i=0,l=arr.length; i<l; i++) {
				if (i == 0)
					arr[i] = arr[i].substr(0, 1).toUpperCase() + arr[i].substr(1);
				else 
					arr[i] = arr[i].substr(0,1).toLowerCase() + arr[i].substr(1);
			}
			return arr.join(" ");
		},
		
		searchQuery: function(){
			var query = $('#search-query-3', this.el).val();
			this.searchMusic(query);
		},
		
		btnPlay: function(){
			var button = $('#btn-play', this.el);
			if (button.hasClass('fui-pause'))
				button.removeClass('fui-pause').addClass('fui-play');
		},
		
		btnPause: function(){
			var button = $('#btn-play', this.el);
			if (button.hasClass('fui-play'))
				button.removeClass('fui-play').addClass('fui-pause');
		},
		
		onPause: function(){
			var bg = chrome.extension.getBackgroundPage();
			bg.player.pauseCurrentSong();
		},
		
		onResume: function(){
			var bg = chrome.extension.getBackgroundPage();
			if (!bg.player.get('currentSong')) return;
			bg.player.playCurrentSong();
		},
		
		searchMusic: function(s){
			var API = 'http://j.ginggong.com/jOut.ashx?h=chiasenhac.com&code=';
			var keyAPI = 'f55a079f-cff2-4969-a9dc-aa4b6e5029f5';
			var self = this;
			$.ajax({
				context: this,
				url: API + keyAPI,
				data: 'k=' + encodeURIComponent(s),
				dataType: 'json',
				success: function(data){
					self.searchList = data;
					var searchList =  $('#search-list');
					searchList.empty();
					if (data.length === 0){
						searchList.append("<li>Try again</li>");
						searchList.append("<li>Tips: Searching with both name and artist of the song</li>");
					}
					for (var i = 0; i < data.length; ++i){
						if (i > 8) break;
						
						var left = data[i]['Title'].indexOf('/');
						var right = data[i]['Title'].indexOf('+');
						if (left == -1) left = 0; else left++;
						if (right == -1) right = data[i]['Title'].length - 1; else right--;
						
						data[i]['Title'] = this.shorter(this.toPascalCase(data[i]['Title'].substr(left, right - left + 1)
										.replace(/[\u4e00-\u9fff\u3400-\u4dff\uf900-\ufaff]/g, '')), 40 - data[i]['Artist'].length);
						
						searchList.append("<a href='#' class='musicSearch' data-nth='" + i + "'><li>" + data[i]['Title'] + 
										  "<img src='" + data[i]['Avatar'] + "'</img>" +
										  "<span>" + data[i]['Artist'] + "</span>" +
										  "</li></a>");
					}
				}
			});
		},
		
		shorter: function(s, l){
			console.log(l);
			if (s.length < l) return s;
			 else return s.substr(0, l) + '...';
		}
	});
	return PopupView;
});