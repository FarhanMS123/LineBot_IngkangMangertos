console.log("Initialize Utilites");
var util = require("util");
var path = require("path");
var mimeTypes = require("mime-types");
var fs = require("fs");
function addZero(num, lim){
	return (num.toString().length < lim ? ("0").repeat(lim - num.toString().length) : "") + num.toString();
}

console.log("Initialize Firebase Admin");
var firebase_admin = global.fb = require('firebase-admin');
var firebase_serviceAccount = require("./ingkang-mangertos-firebase-adminsdk.json");
firebase_admin.initializeApp({
	credential: firebase_admin.credential.cert(firebase_serviceAccount),
	storageBucket: "ingkang-mangertos.appspot.com"
});

var db = global.db = firebase_admin.firestore();
var FieldValue = firebase_admin.firestore.FieldValue;

var bucket = global.bk = firebase_admin.storage().bucket();

console.log("Initialize Line Bot SDK");
var line = require('@line/bot-sdk');
var line_config = require("./ingkang-mangertos_line_bot.json");
var line_client = new line.Client(line_config);

console.log("Initialize Webhook Services.");
var express = require("express");
var app = express();

app.all("/webhook/line", line.middleware(line_config), function(req,res,next){
    Promise
		.all(req.body.events.map(function(event){
			var srcType = event.source.type;
			var isUser = srcType == "user";
			var isGroup = srcType == "group";
			var isRoom = srcType == "room";
			var sourceId = event.source.groupId || event.source.roomId || event.source.userId;

			var dbLogs = db.collection('line').doc(sourceId);
			var docLogs = {};
			var dtLogs = {};

			dbLogs.get().then(function(doc){
				docLogs = doc;
				if(doc.exists){
					dtLogs = doc.data();
					if(dtLogs.isLogging == undefined) dtLogs.isLogging = true;
					if(dtLogs.isLogging){
						if(dtLogs.events == undefined) dtLogs.events = [];
						while(dtLogs.events.length >= 100){dtLogs.events.shift()}
						dtLogs.events.push(event);
						dbLogs.update(dtLogs);
					}
				}else{
					dtLogs = {events:[event], timezone:+25200000, isLogging:true, join_time:new Date()};
					dbLogs.set(dtLogs);
				}
				
				switch(event.type){
					case "follow":
						return line_client.replyMessage(event.replyToken, {
							type: "text",
							text: fs.readFileSync("./text/follow.txt").toString()
						});
						break;
					case "join":
						return line_client.replyMessage(event.replyToken, {
							type: "text",
							text: fs.readFileSync("./text/join.txt").toString()
						});
						break;
					case "message":
						switch(event.message.type){
							case "text":
								var msg = event.message.text;
								var isValid = msg.indexOf(" ") >= 0;
								var query = isValid ? msg.slice(0, msg.indexOf(" ")) : msg;
								var args = isValid ? msg.slice(msg.indexOf(" ") + 1) : "";
	
								switch(true){
									case (query == "/pencatat"):
										var text = "";

										if(isValid){
											if(args == "hidup" || args == "mati"){
												dtLogs.isLogging = args == "hidup" ? true : false;
												dbLogs.update(dtLogs);
												text = `Mengatur pencatat dalam keadaan ${args}`;
											}else{
												text = `/pencatat hidup||mati\r\nStatus : ${dtLogs.isLogging ? "hidup" : "mati"}\r\n\r\nDigunakan untuk mengatur keadaan pencatat.\r\n\r\nhidup : mencatat semua perilaku\r\nmati : tidak mencatat apapun\r\n*pastikan dalam huruf kecil`;
											}
										}else{
											text = `/pencatat hidup||mati\r\nStatus : ${dtLogs.isLogging ? "hidup" : "mati"}\r\n\r\nDigunakan untuk mengatur keadaan pencatat.\r\n\r\nhidup : mencatat semua perilaku\r\nmati : tidak mencatat apapun\r\n*pastikan dalam huruf kecil`;
										}

										return line_client.replyMessage(event.replyToken, {
											type: "text",
											text: text
										});
										break;
									case (query == "/pesan"):
										if(isValid && (/^\d\d:\d\d-\d\d:\d\d$/).exec(args)){
											var date1 = (/^\d\d:\d\d/).exec(args)[0].split(":");
											var date2 = (/\d\d:\d\d$/).exec(args)[0].split(":");
	
											var newDate = new Date();
											
											var newDate4time1 = parseInt(date1[0]) > parseInt(date2[0]) ? newDate.getDate() - 1 : (parseInt(date1[0]) == parseInt(date2[0]) ? (parseInt(date1[1]) > parseInt(date2[1]) ? newDate.getDate() - 1 : newDate.getDate()) : newDate.getDate());
											
											var time1 = new Date(newDate.getFullYear(), newDate.getMonth(), newDate4time1, parseInt(date1[0]), parseInt(date1[1]), 0, 0);
											var time2 = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), parseInt(date2[0]), parseInt(date2[1]), 0, 0);
											
											var text = "";
											var evIndex = 0;
											function nextmsg(){
												if(dtLogs.events[evIndex] != undefined){
													var evDate = new Date(dtLogs.events[evIndex].timestamp + dtLogs.timezone);

													if(evDate.getTime() <= time2.getTime()){
														if(evDate.getTime() >= time1.getTime()){
															text += `${addZero(evDate.getHours(), 2)}:${addZero(evDate.getMinutes(), 2)} : `;
															function funcSwitch(isErr){
																switch(dtLogs.events[evIndex].type){
																	case "message":
																		switch(dtLogs.events[evIndex].message.type){
																			case "text":
																				text += dtLogs.events[evIndex].message.text;
																				break;
																			case "image":
																				text += `image#${dtLogs.events[evIndex].message.id}\r\nhttps://ingkang-mangertos.herokuapp.com/media/${dtLogs.events[evIndex].message.id}`;
																				break;
																			case "video":
																				text += `video#${dtLogs.events[evIndex].message.id} for ${dtLogs.events[evIndex].message.duration}ms\r\nhttps://ingkang-mangertos.herokuapp.com/media/${dtLogs.events[evIndex].message.id}`;
																				break;
																			case "audio":
																				text += `audio#${dtLogs.events[evIndex].message.id} for ${dtLogs.events[evIndex].message.duration}ms\r\nhttps://ingkang-mangertos.herokuapp.com/media/${dtLogs.events[evIndex].message.id}`;
																				break;
																			case "file":
																				text += `file#${dtLogs.events[evIndex].message.id}\r\n${dtLogs.events[evIndex].message.fileName} ${dtLogs.events[evIndex].message.fileSize}\r\nhttps://ingkang-mangertos.herokuapp.com/media/${dtLogs.events[evIndex].message.id}`;
																				break;
																			default:
																				text += util.inspect(dtLogs.events[evIndex], true, Infinity);
																				break;
																		}
																		break;
																	case "join":
																		text += "[Ingkang Mangertos bergabung dengan grup.]"
																		break;
																	default:
																		text += util.inspect(dtLogs.events[evIndex], true, Infinity);
																		break;
																}
																text += "\r\n";

																evIndex += 1;
																nextmsg();
															}
															(function(){
																if(isGroup){
																	return line_client.getGroupMemberProfile(dtLogs.events[evIndex].source.groupId, dtLogs.events[evIndex].source.userId);
																}else if(isRoom){
																	return line_client.getRoomMemberProfile(dtLogs.events[evIndex].source.groupId, dtLogs.events[evIndex].source.userId);
																}else if(isUser){
																	return line_client.getProfile(dtLogs.events[evIndex].source.userId);
																}
															})().then(function(user){
																text += `${user.displayName} : `;
																funcSwitch();
															}).catch(function(e){
																console.log(e);
																
																text += dtLogs.events[evIndex].source.userId ? `${dtLogs.events[evIndex].source.userId} : ` : "";
																funcSwitch(true);
															});
														}else{
															evIndex += 1;
															nextmsg();
														}
													}else{
														return line_client.replyMessage(event.replyToken, {
															type: "text",
															text: text == "" ? "[Masih belum ada pesan.]...2" : text
														});
													}
												}else{
													return line_client.replyMessage(event.replyToken, {
														type: "text",
														text: text == "" ? "[Masih belum ada pesan.]...1" : text
													});
												}
											}
											nextmsg();
										}else{
											return line_client.replyMessage(event.replyToken, {
												type: "text",
												text: "/pesan HH:mm-HH:mm\r\n\r\nDigunakan untuk melihat pesan dari waktu tertentu\r\n\r\nHH : merupakan format jam dari 00 sampai 23\r\nmm : merupakan format menit dari 00 sampai 59"
											});
										}
										break;
									case (query == "/berkas"):
										var text = "";
										if(isValid){
											text = `https://ingkang-mangertos.herokuapp.com/media/${args}`;
										}else{
											text = "/berkas id_berkas\r\n\r\nDigunakan untuk menampilkan berkas yang pernah dikirim oleh user.\r\n\r\nid_berkas : identitas berkas yang ditunjukan dalam pesan.";
										}
										return line_client.replyMessage(event.replyToken, {
											type: "text",
											text: text
										});
										break;
									case (query == "/bersihkan"):
										var text = "";

										if(isValid){
											if(args == "paksa"){
												text = "[menghapus semua pesan dalam catatan.]";
												//dtLogs.events = FieldValue.delete();
												dtLogs.events = [event];
												dbLogs.update(dtLogs);
												text += ` ${dtLogs.events.length}`
												//dbLogs.set(dtLogs);
											}else{
												text = "/bersihkan paksa\r\n\r\nDigunakan untuk menghapus semua perilaku yang tercatat dalam database.\r\n\r\npaksa : untuk memaksa penghapusan tanpa konfirmasi.";
											}
										}else{
											text = "/bersihkan paksa\r\n\r\nDigunakan untuk menghapus semua perilaku yang tercatat dalam database.\r\n\r\npaksa : untuk memaksa penghapusan tanpa konfirmasi.";
										}

										return line_client.replyMessage(event.replyToken, {
											type: "text",
											text: text
										});
										break;
									case (query == "/status"):
										break;
									case (query == "/tentang"):
										break;
									case (query == "/kebijakan"):
										break;
									case (query == "/ketentuan"):
										break;
									case (query == "/bantuan"):
										break;
									case (query == "/keluar"):
										var ret = line_client.replyMessage(event.replyToken, {
											type: "text",
											text: fs.readFileSync("./text/left.txt").toString()
										});
										setTimeout(function(){
											if(isGroup) line_client.leaveGroup(sourceId);
											if(isRoom) line_client.leaveRoom(sourceId);
											console.log([isGroup,isRoom,sourceId]);
										},100);
										return ret;
										break;
									//===================================================================
									case (query == "/echo"):
										return line_client.replyMessage(event.replyToken, {
											type: "text",
											text: isValid ? args : "/echo text\r\n\r\nUsed for bot to reply the same text.\r\n\r\ntext : text to be replied"
										});
										break;
									case (query=="/evlength"):
										return line_client.replyMessage(event.replyToken, {
											type: "text",
											text: dtLogs.events.length
										});
										break;
								}
								break;
							case "image":
								line_client.getMessageContent(event.message.id).then(function(stream){
									var fileSaved = bucket.file(`chats/${event.message.id}.${event.message.type}`);
									stream.pipe(fileSaved.createWriteStream())
										.on("error", function(err){
											console.log(err);
										}).on("finish", function(){
											//
										});
								}).catch(function(e){
									console.log(e);
								});
								break;
							case "video":
								line_client.getMessageContent(event.message.id).then(function(stream){
									var fileSaved = bucket.file(`chats/${event.message.id}.${event.message.type}`);
									stream.pipe(fileSaved.createWriteStream())
										.on("error", function(err){
											console.log(err);
										}).on("finish", function(){
											//
										});
								}).catch(function(e){
									console.log(e);
								});
								break;
							case "audio":
								line_client.getMessageContent(event.message.id).then(function(stream){
									var fileSaved = bucket.file(`chats/${event.message.id}.audio`);
									stream.pipe(fileSaved.createWriteStream())
										.on("error", function(err){
											console.log(err);
										}).on("finish", function(){
											//
										});
								}).catch(function(e){
									console.log(e);
								});
								break;
							case "file":
								line_client.getMessageContent(event.message.id).then(function(stream){
									var fileSaved = bucket.file(`chats/${event.message.id}.${event.message.filename}`);
									stream.pipe(fileSaved.createWriteStream())
										.on("error", function(err){
											console.log(err);
										}).on("finish", function(){
											//
										});
								}).catch(function(e){
									console.log(e);
								});
								break;
							case "location":
								break;
							case "sticker":
								break;
							default:
								//
						}
						break;
					case "unfollow":
						dbLogs.delete();
						break;
					case "leave":
						dbLogs.delete();
						break;
					case "memberJoined":
						break;
					case "memberLeft":
						break;
					case "postback":
						break;
					case "beacon":
						break;
					case "accountLink":
						break;
					case "things":
						break;
					default:
						//
				}
			}).catch(function(err){
				console.log(err);

				if(event.replyToken) return line_client.replyMessage(event.replyToken, {
					type: "text",
					text: "Terjadi kesalahan dalam mengambil database.\r\n\r\n" + util.inspect(err, true, Infinity)
				});
			});
		})).then(function(result){
			res.json(result)
		}).catch(function(err){
			res.json(err);
			console.log("Error Promise :");
			console.log(err);
		});
});

app.all("/media/:id", function(req,res){
	var fileid = req.params.id;
	var fileext = req.query.ext;

	bucket.getFiles({prefix:`chats/${fileid}`}, function(err,files){
		if(files.length == 0){
			res.sendStatus(404);
		}else if(files.length == 1){
			files[0].download().then(function(data){
				var filepath = path.parse(files[0].name);
				if(!fileext) switch(filepath.ext){
					case ".image":
						fileext = ".jpg";
						break;
					case ".video":
						fileext = ".mp4";
						break;
					case ".audio":
						fileext = ".mp3";
						break;
				}
				//res.type(fileext);
				console.log([fileext, filepath.ext]);
				res.set("Content-Type", mimeTypes.lookup(fileext));
				res.send(data[0]);
				console.log("data get");
			}).catch(function(e){
				console.log(e);
			});
		}else if(files.length > 1){
			res.sendStatus(500);
		}
	});
});
console.log(`Listening on ${process.env.PORT || 8080}`);
app.listen(process.env.PORT || 8080);