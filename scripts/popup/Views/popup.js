define(['underscore', 
		'backbone',
		'text!/templates/popup_template.html',
		'jquery',
		'moment',
		'player',
		'songModel',
		'database'
], function(_, Backbone, Html, $, Moment, Player, Song, Database){
	var PopupView = Backbone.View.extend({
		popupTemplate: _.template(Html),
		
		events: {
			"click .fui-play" : "onResume",
			"click .fui-pause" : "onPause",
			"change #search-query-3": "searchQuery",
			"click .musicSearch": "selectSong",
			"click .addToPlaylist": "addToPlaylist",
			"click .musicPlaylist": "playPlaylist",
			"click .fui-cross": "deletePlaylist",
			"click .glyphicon-forward" : "nextSong",
			"click .glyphicon-backward" : "prevSong"
		},
		
		initialize: function(){
			this.bg = chrome.extension.getBackgroundPage();
			this.bg.player.on('change', this.renderTime, this);
			this.render();
			this.renderTime();
			window.bg = this.bg;
			this.db = new Database();
			window.db = this.db;
			this.showPlaylist();
			this.addToPlaylistBackground();
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
			$('#playlist-area').hide();
			$('.fui-search').click(function(){
				$('#playlist-area').hide();
				$('#search-area').toggle();
				$('#search-list').empty();
			});
			$('.fui-list-columned').click(function(){
				$('#search-area').hide();
				$('#playlist-area').toggle();
			});
		},
		
		renderTime: function(){
			var duration = 0;
			var time = 0;
			var title = "Miracle Music Player"; 
			var artist = "Without music, life would be a mistake";
			var player = this.bg.player;
			
			if (player.audio && player.audio.ended)
				player.audio.timeCurrent = 0;
			
			if (player.audio && player.audio.duration !== NaN)
				duration = player.audio.duration;
			
			if (player.audio)
				time = player.audio.currentTime;
			
			if (player.get('currentSong')){
				title = player.get('currentSong').get('Title');
				artist = player.get('currentSong').get('Artist');
			}
			
			if (duration !== 0 && duration === time){
				player.audio.currentTime = 0;
				player.pauseCurrentSong();
				player.nextSong();
			}
			
			if (duration !== 0)
				$('#slider', this.el).slider({ value: time * 100 / duration });
			
			if (player.audio && player.audio.ended)
				$('#slider', this.el).slider({ value: time * 100 / duration });
			
			$('#time', this.el).html( Moment().startOf('day').seconds(time).format('mm:ss') );
			
			$('#song-title', this.el).html(title);
			$('#song-title', this.el).addClass('faa-horizontal animated faa-slow');
			$('#song-artist', this.el).html(artist);
			$('#song-artist', this.el).addClass('faa-horizontal animated faa-slow');
			if (player.get('state')) this.btnPause();
			else this.btnPlay();
			
		},
		
		selectSong: function(e){
			console.log(e);
			var nth = e.currentTarget.getAttribute('data-nth');
			var data = this.searchList[nth];
			console.log(data);
			var bg = chrome.extension.getBackgroundPage();
			bg.player.pauseCurrentSong();
			var listSong = {i:0, list: data};
			var list = [];
			list.push(data);
			console.log(list);
			bg.player.playlist(0, list).playCurrentSong();;
			this.btnPause();
		},

		playPlaylist: function(e){
			var self = this;
			var Id = e.currentTarget.getAttribute('data-nth');
			var db = new Database();
			var bg = chrome.extension.getBackgroundPage();
			bg.player.pauseCurrentSong();

			db.request.onsuccess = function(){
				var list = [];
				var request = db.request.result.transaction("customers").objectStore("customers").get(Id);
				var request2 = db.request.result.transaction("customers").objectStore("customers").openCursor();
				var i = -1;
				var callback = function(){
					bg.player.playlist(i - 1, list);
					self.showPlaylist();
				}

				request2.onsuccess = function(event){
					var cursor = event.target.result;
					if (cursor){
						console.log(cursor.value);
						list.push(cursor.value);
						if (cursor.value['Id'] == Id)
							i = list.length;
						cursor.continue();
					}
					else 
						callback();
				}
			}
		},

		addToPlaylistBackground: function(){
			var db = new Database();
			db.request.onsuccess = function(){
				var list = [];
				// var request = db.request.result.transaction("customers").objectStore("customers").get(Id);
				var request2 = db.request.result.transaction("customers").objectStore("customers").openCursor();
				var callback = function(){
					console.log("addToPlaylistBackground");
					bg.player.playlist(0, list, false);
				}

				request2.onsuccess = function(event){
					var cursor = event.target.result;
					if (cursor){
						console.log(cursor.value);
						list.push(cursor.value);
						cursor.continue();
					}
					else 
						callback();
				}
			}
		},

		addToPlaylist: function(e){
			// console.log(e.currentTarget);
			$(e.currentTarget).hide();
			var nth = e.currentTarget.getAttribute('data-nth');
			var data = this.searchList[nth];
			this.db.add(data);
			this.showPlaylist();
			this.addToPlaylistBackground();
		},

		deletePlaylist: function(e) {
			var self = this;
			var Id = e.currentTarget.getAttribute('data-nth');
			var db = new Database();
			console.log(Id);
			db.request.onsuccess = function(){
				var request = db.request.result.transaction("customers", "readwrite").objectStore("customers").delete(Id);
				self.addToPlaylistBackground();
			}
			this.showPlaylist();
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

		inPlaylist: function(song){
			var bg = chrome.extension.getBackgroundPage();
			var list = bg.player.get('list');
			for (var i = 0; i < list.length; ++i)
				if (list[i]['Id'] === song['Id'] || list[i]['Title'] === song['Title'] )
					return true;
			return false;
		},

		isPlaying: function(song){
			var bg = chrome.extension.getBackgroundPage();
			var list = bg.player.get('list');
			var i = bg.player.get('i');
			if (!list || list.length === 0)
				return false;
			var s = list[i];
			console.log(list);
			if (s['Id'] === song['Id'] || s['Title'] === song['Title'])
				return true;
			return false;
		},
		
		searchMusic: function(s){
			var self = this;
			// SC.initialize({
			//   	client_id: '543ea2d2b1d330cf33e36d7f5831ef91'
			// });

			// // find all sounds of buskers licensed under 'creative commons share alike'
			// SC.get('/tracks', {
			//   	q: s
			// }).then(function(data) {
			//   	console.log(data);
			//   	self.searchList = data;
			// 		var searchList =  $('#search-list');
			// 		searchList.empty();
			// 		if (data.length === 0){
			// 			searchList.append("<li>Try again</li>");
			// 			searchList.append("<li>Tips: Searching with both name and artist of the song</li>");
			// 		}
			// 		console.log(data.length);
			// 		for (var i = 0; i < data.length; ++i){
			// 			if (i > 6) break;
			// 			// var left = data[i]['title'].indexOf('/');
			// 			// var right = data[i]['title'].indexOf('+');
			// 			// // console.log(data[i]['title']);	
			// 			// if (left === -1) left = 0; else left++;
			// 			// if (right === -1) right = data[i]['title'].length - 1; else right--;
			// 			// // console.log(data[i]['title']);						
			// 			// data[i]['title'] = this.shorter(this.toPascalCase(data[i]['title'].substr(left, right - left + 1)
			// 			// 				.replace(/[\u4e00-\u9fff\u3400-\u4dff\uf900-\ufaff]/g, '')), 40 - data[i]['Artist'].length);
			// 			// console.log(data[i]['title']);

			// 			var id = data[i]['title'].indexOf('-');
			// 			var title = data[i]['title'].substr(0, id);
			// 			var artist = data[i]['title'].substr(id+1, 999);
			// 			if (id === -1){
			// 				title = data[i]['title'];
			// 				artist = "Unknow";
			// 			}
			// 			console.log(title + " " + artist);
			// 			searchList.append("<li class='track'>" + (self.inPlaylist(data[i]) ? "" : "<a class='fui-plus addToPlaylist' href='#' data-nth='" + i + "'/>") +
			// 							  "</a><a href='#' class='fui-triangle-right-large musicSearch' data-nth='" + i + "' href='#'></a>" 
			// 							  + title + 
			// 							  "<img src='" + data[i]['artwork_url'] + "'</img>" +
			// 							  "<p>" + artist + "</p>" +
			// 							  "</li>");
			// 		}
					
			// 		$('.track', this.el).hover(
			// 			function(){
			// 				$($(this)[0].children[0]).show();
			// 				$($(this)[0].children[1]).show();
			// 				$('img', this).show();
			// 				$('p', this).show();
			// 			}, 
			// 			function(){
			// 				$($(this)[0].children[0]).hide();
			// 				$($(this)[0].children[1]).hide();
			// 				$('img', this).show();
			// 				$('p', this).show();
			// 			}
			// 		);
			// });
			var API = 'http://mp3.zing.vn/suggest/search?';
			// var keyAPI = 'f55a079f-cff2-4969-a9dc-aa4b6e5029f5';
			$.ajax({
				context: this,
				url: API,
				data: 'term=' + encodeURIComponent(s),
				dataType: 'json',
				success: function(data){
					var list = [];
					self.searchList = [];
					console.log(data['song']['list']);
					self.searchList = [];
					var searchList =  $('#search-list');
					searchList.empty();
					if (data.length === 0){
						searchList.append("<li>Try again</li>");
						searchList.append("<li>Tips: Searching with both name and artist of the song</li>");
					}
					data = data['song']['list'];
					for (var i = 0; i < data.length; ++i){
						if (i > 6) break;
						
						$.ajax({
							context: self,
							url: 'http://mp3.zing.vn/bai-hat/a/' + data[i]['object_id'] + '.html',
							success: function(data) {
								var regex = /xmlURL=(.+?)\&amp\;textad/g;
								var xml = data.match(regex)[0];
								xml = xml.replace('&amp;textad', '').replace('xmlURL=', '');
								$.ajax({
									context: self,
									url: xml,
									dataType: 'text',
									success: function(data) {
										var regex = /<!\[CDATA\[.*?\]\]>/g;
										var title = data.match(regex)[0].replace('<![CDATA[', '').replace(']]>', '');
										var name = data.match(regex)[1].replace('<![CDATA[', '').replace(']]>', '');
										var link = data.match(regex)[3].replace('<![CDATA[', '').replace(']]>', '');
										var Id = data.match(regex)[7].replace('<![CDATA[', '').replace(']]>', '');
										var ava = data.match(regex)[8].replace('<![CDATA[', '').replace(']]>', '');
										var song = {Title: title, Artist: name, UrlJunDownload: link, Id: Id, Avatar: ava}; 
										console.log(song);
										list.push(song);
										self.searchList.push(song);
										song['Title'] = song['Title'].replace(/[\u4e00-\u9fff\u3400-\u4dff\uf900-\ufaff/]/g, '');
										// song['Title'] = song['Title'].substr(0, song['Title'].indexOf('+'));
										// console.log(song['Title'] + "/" + song['Artist']);
										searchList.append("<li class='track'>" + (self.inPlaylist(song) ? "" : "<a class='fui-plus addToPlaylist' href='#' data-nth='" + (list.length - 1) + "'/>") +
										  "</a><a href='#' class='fui-triangle-right-large musicSearch' data-nth='" + (list.length - 1) + "' href='#'></a>" 
										  + self.shorter(song['Title'], 30) + 
										  "<img src='" + ava + "'</img>" +
										  "<p>" + name + "</p>" +
										  "</li>");
										$('.track', this.el).hover(
											function(){
												$($(this)[0].children[0]).show();
												$($(this)[0].children[1]).show();
												$('img', this).show();
												$('p', this).show();
											}, 
											function(){
												$($(this)[0].children[0]).hide();
												$($(this)[0].children[1]).hide();
												$('img', this).show();
												$('p', this).show();
											}
										);
									}
								});
							}
						});

					}
					
					
				}
			});
			
		},
		
		//class='musicSearch' data-nth='" + i + "'>
		
		shorter: function(s, l){
			if (s.length < l) return s;
			 else return s.substr(0, l) + '...';
		},

		showPlaylist: function(){
			var self = this;
			$('#playlist-area').empty();

			var db = new Database();
			db.request.onsuccess = function(){
				var objectStore = db.request.result.transaction("customers").objectStore("customers");
				objectStore.openCursor().onsuccess = function(event) {
					var cursor = event.target.result;
					if (cursor){
						console.log(cursor.value);
						var song = cursor.value;
						if (!self.isPlaying(song))
							$('#playlist-area').append("<li class='track'>" + "<a class='fui-cross' href='#' data-nth='" + cursor.value['Id'] + "'></a><a href='#' class='fui-triangle-right-large musicPlaylist' data-nth='" + cursor.value['Id'] + "' href='#'></a>" + cursor.value['Title'] + 
											  "<img src='" + cursor.value['Avatar'] + "'</img>" +
											  "<p>" + cursor.value['Artist'] + "</p>" +
											  "</li>");
						else
							$('#playlist-area').append("<li class='track playing'>" +
												"<a class='fui-cross' href='#' data-nth='" + cursor.value['Id'] + "'></a>" +
											  cursor.value['Title'] + 
											  "<img src='" + cursor.value['Avatar'] + "'</img>" +
											  "<p class=''>" + cursor.value['Artist'] + "</p>" +
											  "</li>");
						$('.track', this.el).hover(
							function(){
								$($(this)[0].children[0]).show();
								$($(this)[0].children[1]).show();
								$('p', this).show();
								$('img', this).show();
							}, 
							function(){
								$($(this)[0].children[0]).hide();
								$($(this)[0].children[1]).hide();
								$('p', this).show();
								$('img', this).show();
							}
						)
						cursor.continue();
					} 
				}	

			}
		},

		nextSong: function(){
			this.showPlaylist();
			this.bg.player.pauseCurrentSong();
			this.bg.player.nextSong();
		},

		prevSong: function(){
			this.showPlaylist();
			this.bg.player.pauseCurrentSong();
			this.bg.player.prevSong();	
		}
	});
	return PopupView;
});