var util = require("util");
var fs = require("fs");
var path = require("path");

var express = require("express");
var line = require('@line/bot-sdk');

function pathNormalize(path2){
	var path1 = path.dirname(module.filename);
	return path.join(path1, path2);
}

var app = express();

var config = {
  channelAccessToken: '',
  channelSecret: ''
};

app.all("/*", line.middleware(config), function(req,res,next){
	console.log(util.inspect(req.body, true, Infinity, true));
	
	req.body.events.map(function(ev){
		var resJSON = handleEvent(ev);
		if(!res.finished) res.end(JSON.stringify(resJSON));
	});
});

exports.onRequest = app;

var client = new line.Client(config);
function handleEvent(event) {
	switch(event.type){
		case "follow":
			return client.replyMessage(event.replyToken, {
				type: 'text',
				text: fs.readFileSync(pathNormalize("./text/follow.txt")).toString()
			});
			break;
		case "join":
			var arr = [];
			arr.push(event);
			if(!fs.existsSync(pathNormalize("./db/" + event.source.groupId + ".log"))) fs.writeFileSync(pathNormalize("./db/" + event.source.groupId + ".log"), JSON.stringify(arr));
			return client.replyMessage(event.replyToken, {
				type: 'text',
				text: fs.readFileSync(pathNormalize("./text/join.txt")).toString()
			});
			break;
		case "leave":
			fs.unlinkSync(pathNormalize("./db/" + event.source.groupId + ".log"));
			break;
		case "message":
			if(event.source.type == "group" || event.source.type == "room"){
				var dt = JSON.parse(fs.readFileSync(pathNormalize("./db/" + event.source.groupId + ".log")));
				dt.push(event);
				if(dt.length >= 1000) dt.shift();
				fs.writeFileSync(pathNormalize("./db/" + event.source.groupId + ".log"), JSON.stringify(dt));
				
				if((new Date().getYear() == 119 && new Date().getMonth() == 3 && new Date().getDate() == 30)){
					client.replyMessage(event.replyToken, {
						type: 'text',
						text: "[DEPRECATED V1.0.0]\nThis version are has been deprecated and no longer available by 30 april 2019.\nThankyou for using our service.\n\n</> with ❤,\nNuzantara Team\n\n@farhanms134.\n\nThe new star has sine today. Did you apreciate him?"
					});
					setTimeout(function(){client.leaveGroup(event.source.groupId);},1000);
					return {};
				}				

				switch(event.message.type){
					case "text":
						if(event.message.text == "/leave"){
							client.replyMessage(event.replyToken, {
								type: 'text',
								text: "[DEPRECATED V1.0.0]\nThis version are has been deprecated and no longer available by 30 april 2019.\nThankyou for using our service.\n\n</> with ❤,\nNuzantara Team\n\n@farhanms134"
							});
							setTimeout(function(){client.leaveGroup(event.source.groupId);},1000);
							return {};
						}else if(event.message.text == "/dep"){
							return client.replyMessage(event.replyToken, {
								type: 'text',
								text: "[DEPRECATED V1.0.0]\nThis version are going deprecated and no longer available by 30 april 2019.\nThankyou for using our service.\n\n</> with ❤,\nNuzantara Team\n\n@farhanms134"
							});
						}else if(/^\/msgShow \d\d:\d\d-\d\d:\d\d$/.exec(event.message.text) !== null){
							var date1 = / \d\d:\d\d-/.exec(event.message.text)[0]; date1 = date1.slice(1, date1.length -1).split(":");
							var date2 = /-\d\d:\d\d$/.exec(event.message.text)[0]; date2 = date2.slice(1).split(":");
							
							time1 = new Date(); time1.setHours(date1[0]); time1.setMinutes(date1[1]); time1.setSeconds(0); time1.setMilliseconds(0);
							time2 = new Date(); time2.setHours(date2[0]); time2.setMinutes(date2[1]); time2.setSeconds(0); time2.setMilliseconds(0);
							if(time1.getHours() > time2.getHours() || (time1.getHours() == time2.getHours() && time1.getMinutes() > time2.getMinutes())) time1.setDate(time1.getDate() - 1)
							time1 = time1.getTime(); time2 = time2.getTime();
							var arr = [], i=0;
							function nextMsg(){
								//console.log([date1, date2, time1, time2, i, dt[i]])
								if(dt[i] != undefined){
									if(time2 >= dt[i].timestamp){
										if(time1 <= dt[i].timestamp){
											var n = arr.length;
											
											// [13:30] Farhan MS. : This is a example sample
											// [17:00] Farhan MS. : image#31415926535
											// [17:00] Farhan MS. : file#31415926535 OSN2017.pdf 5MB
											// [17:00] Farhan MS. : audio#31415926535 01:02:03
											// [17:00] Farhan MS. : video#31415926535 01:02:03
											// [17:00] Farhan MS. : Sticker [831408,1018923] <-- [StickerId,PackageId]
											
											client.getGroupMemberProfile(dt[i].source.groupId, dt[i].source.userId).then(function(user){
												//console.log([i,n,dt[i]]);
												switch(dt[i].type){
													case "message":
														switch(dt[i].message.type){
															case "text":
																arr[n] = `[${new Date(dt[i].timestamp).getHours()}:${new Date(dt[i].timestamp).getMinutes()}:${new Date(dt[i].timestamp).getSeconds()}.${new Date(dt[i].timestamp).getMilliseconds()}] ${user.displayName} : ${dt[i].message.text}`;
																break;
															case "image":
															case "audio":
															case "video":
															case "file":
																var duration="";
																if(typeof dt[i].message.duration != "undefined"){
																	duration = new Date(Number(dt[i].message.duration));
																	duration = ` ${duration.getHours()}:${duration.getMinutes()}:${duration.getSeconds()}.${duration.getMilliseconds()}`;
																}
																arr[n] = `[${new Date(dt[i].timestamp).getHours()}:${new Date(dt[i].timestamp).getMinutes()}:${new Date(dt[i].timestamp).getSeconds()}.${new Date(dt[i].timestamp).getMilliseconds()}] ${user.displayName} : ${dt[i].message.type}#${dt[i].message.id}${duration}${dt[i].message.fileName != undefined ? " " + dt[i].message.fileName : ""} ${dt[i].message.fileSize != undefined ? ` ${dt[i].message.fileSize} Bytes` : ""}`;
																break;
															default :
																arr[n] = `[${new Date(dt[i].timestamp).getHours()}:${new Date(dt[i].timestamp).getMinutes()}:${new Date(dt[i].timestamp).getSeconds()}.${new Date(dt[i].timestamp).getMilliseconds()}] ${user.displayName} : ` + JSON.stringify(dt[i]);
														}
														break;
													default:
														arr[n] = `[${new Date(dt[i].timestamp).getHours()}:${new Date(dt[i].timestamp).getMinutes()}:${new Date(dt[i].timestamp).getSeconds()}.${new Date(dt[i].timestamp).getMilliseconds()}] : ` + JSON.stringify(dt[i]);
												}
												i+=1;
												nextMsg();
											}).catch(function(e){
												//console.log([i,n,dt[i]]);
												//console.log("----------------------------------------------------------");
												//console.log([i, n]);
												//console.log(e);
												//console.log("----------------------------------------------------------");
												switch(dt[i].type){
													case "message":
														switch(dt[i].message.type){
															case "text":
																arr[n] = `[${new Date(dt[i].timestamp).getHours()}:${new Date(dt[i].timestamp).getMinutes()}:${new Date(dt[i].timestamp).getSeconds()}.${new Date(dt[i].timestamp).getMilliseconds()}] : ${dt[i].message.text}`;
																break;
															default :
																arr[n] = `[${new Date(dt[i].timestamp).getHours()}:${new Date(dt[i].timestamp).getMinutes()}:${new Date(dt[i].timestamp).getSeconds()}.${new Date(dt[i].timestamp).getMilliseconds()}] : ` + JSON.stringify(dt[i]);
														}
														break;
													default:
														arr[n] = `[${new Date(dt[i].timestamp).getHours()}:${new Date(dt[i].timestamp).getMinutes()}:${new Date(dt[i].timestamp).getSeconds()}.${new Date(dt[i].timestamp).getMilliseconds()}] : ` + JSON.stringify(dt[i]);
												}
												i+=1;
												nextMsg();
											});
										}else{
											i+=1;
											nextMsg();
										}
									}else{
										return client.replyMessage(event.replyToken, {
											type: 'text',
											text: arr.join("\n")
										});
									}
								}else{
									if(i >= dt.length){
										return client.replyMessage(event.replyToken, {
											type: 'text',
											text: arr.join("\n")
										});
									}else{
										i+=1
										nextMsg();
									}
								}
							}
							nextMsg();
						}
						break;
					case "file":
					case "image":
					case "video":
					case "audio":
						if(event.source.type == "group") client.getMessageContent(event.message.id)
							.then(function(stream){
								stream.on('data', function(chunk){
									var fext = event.message.type == "image" ? ".jpg" : event.message.type == "audio" ? ".mp3" : event.message.type == "video" ? ".mp4" : event.message.type == "file" ? path.extname(event.message.fileName) : "";
									fs.appendFileSync(pathNormalize(`./db/${event.source.groupId}_${event.message.id}${fext}`), chunk)
								});
								stream.on('error', function(err){
									//console.log(err)
								});
							}).catch(function(e){
								//console.log(e);
							});
						break;
				}
			}else{
				return client.replyMessage(event.replyToken, {
					type: 'text',
					text: fs.readFileSync(pathNormalize("./text/dont_msg_pm.txt")).toString()
				});
			}
			break;
		default:
			return {status:"null"};
	}
}