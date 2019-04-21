global.util = require("util");
global.fs = require("fs");
global.path = require("path");

global.express = require('express');
global.line = require('@line/bot-sdk');

global.config = {
  channelAccessToken: 'gPBsadqtD+KtYEPhY9k6PH6tY04yo0dmfX7x7Qe9fO8Wh2q06SVbl6nXKfpl2Qj9XTZoNccd5KVjP7Kak59VDXvAu8L90EU7XqtV7rLgxOenKYMjp8xSUOuKwGPP6UBrlysIzzij1cbiU0HGyB1/LwdB04t89/1O/w1cDnyilFU=',
  channelSecret: '1d4715f40fcab789a3a955dfd3565072'
};

global.app = express();
app.post('/webhook', line.middleware(config), (req, res) => {
	console.log(util.inspect(req.body, true, Infinity, true));
	req.body.events.map(function(ev){
		var resJSON = handleEvent(ev);
		if(!res.headersSent) res.json(resJSON);
	});
});

global.client = new line.Client(config);
function handleEvent(event) {
	switch(event.type){
		case "follow":
			return client.replyMessage(event.replyToken, {
				type: 'text',
				text: fs.readFileSync("./text/follow.txt").toString()
			});
			break;
		case "join":
			var arr = [];
			arr.push(event);
			if(!fs.existsSync("./db/" + event.source.groupId + ".log")) fs.writeFileSync("./db/" + event.source.groupId + ".log", JSON.stringify(arr));
			return client.replyMessage(event.replyToken, {
				type: 'text',
				text: fs.readFileSync("./text/join.txt").toString()
			});
			break;
		case "leave":
			fs.unlinkSync("./db/" + event.source.groupId + ".log");
			break;
		case "message":
			if(event.source.type == "group" || event.source.type == "room"){
				var dt = JSON.parse(fs.readFileSync("./db/" + event.source.groupId + ".log"));
				dt.push(event);
				if(dt.length >= 1000) dt.shift();
				fs.writeFileSync("./db/" + event.source.groupId + ".log", JSON.stringify(dt));
				switch(event.message.type){
					case "text":
						if(event.message.text == "/leave"){
							client.leaveGroup(event.source.groupId);
						}else if(/^\/msgShow \d\d:\d\d-\d\d:\d\d$/.exec(event.message.text) !== null){
							var date1 = / \d\d:\d\d-/.exec(event.message.text)[0]; date1 = date1.slice(1, date1.length -1).split(":");
							var date2 = /-\d\d:\d\d$/.exec(event.message.text)[0]; date2 = date2.slice(1).split(":");
							
							time1 = new Date(); time1.setHours(date1[0]); time1.setMinutes(date1[1]); time1.setSeconds(0); time1.setMilliseconds(0);
							time2 = new Date(); time2.setHours(date2[0]); time2.setMinutes(date2[1]); time2.setSeconds(0); time2.setMilliseconds(0);
							if(time1.getHours() > time2.getHours() || (time1.getHours() == time2.getHours() && time1.getMinutes() > time2.getMinutes())) time1.setDate(time1.getDate() - 1)
							time1 = time1.getTime(); time2 = time2.getTime();
							var arr = [], i=0;
							console.log(i);
							function nextMsg(){
								console.log([date1, date2, time1, time2, i, dt[i]])
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
												console.log([i,n,dt[i]]);
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
												console.log([i,n,dt[i]]);
												console.log("----------------------------------------------------------");
												console.log([i, n]);
												console.log(e);
												console.log("----------------------------------------------------------");
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
						client.getMessageContent(event.message.id)
							.then(function(stream){
								stream.on('data', function(chunk){
									var fext = event.message.type == "image" ? ".jpg" : event.message.type == "audio" ? ".mp3" : event.message.type == "video" ? ".mp4" : event.message.type == "file" ? path.extname(event.message.fileName) : "";
									fs.appendFileSync(`./db/${event.source.groupId}_${event.message.id}${fext}`, chunk)
								});
								stream.on('error', function(err){
									console.log(err)
								});
							});
						break;
				}
			}else{
				return client.replyMessage(event.replyToken, {
					type: 'text',
					text: fs.readFileSync("./text/dont_msg_pm.txt").toString()
				});
			}
			break;
		default:
			return {status:"null"};
	}
}

//app.listen(process.env.PORT);
app.listen(3000);
console.log("Bots Start");