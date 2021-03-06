var firstStored = null;
var moreStatementsUrl = null;
var auth = null;
var endpoint = null;
var includeRawData = true;

google.load('visualization', '1.0', {'packages':['corechart']});

$(document).ready(function(){
    ADL.XAPIWrapper.changeConfig(Config);
    GetStatements(25,null,null,RenderStatements);
    $('#refreshStatements').click(function(){
        $("#theStatements").empty();
        GetStatements(25,null,null,RenderStatements);
    });
    $('#showAllStatements').click(function(){
        GetStatements(25,null,null,RenderStatements, true);
    });
    GetActivityProfile ("act:adlnet.gov/Memory", "profile:highscores", RenderHighScores);
    GetStatements(0,null,"act:adlnet.gov/Memory",RenderMediaData);
    GetActivityProfile ("act:adlnet.gov/CastleDefense", "profile:highscores", RenderHighScoresCD);
    GetStatements(0,null,"act:adlnet.gov/CastleDefense",RenderMediaDataCD);
    $("#searchUser").click(function(){
	if ($("#UserToSearch").val()==""){
	       alert("Please you have to enter an email"); 
	}else{
		searchStatements();
	}

    });
});
getCallback = function(callback){
    var self = this;
    return function(){ callback.apply(self, arguments); };
};

getAuth = function(){ 
    if(this.auth == null){
        this.auth = 'Basic ' + Base64.encode(Config.user + ':' + Config.password);
    }
    return this.auth;
};

getEndpoint = function(){
    if(this.endpoint == null){
        this.endpoint = Config.endpoint;
    }
    return this.endpoint;
};

XAPIStatementQueryObject = function(){
    this.verb = null;
    this.activity = null;
    this.registration = null;
    this.agent = null;
    this.since = null;
    this.until = null;
    this.limit = 0;
    
    this.toString = function(){
        var qs = new Array();
        for(var key in this){
            if(key == "toString" ||
                key == "toObj" || 
                this[key] == null){
                continue;
            }
            var val = this[key];
            if(typeof val == "object"){
                val = JSON.stringify(val);
            }
            qs.push(key + "=" + encodeURIComponent(val));
        }
        return qs.join("&");
    };

    this.toObj = function(){
        var outObj = new Object();
        for(var key in this){
            if(key == "toString" ||
                key == "toObj" || 
                this[key] == null){
                continue;
            }
            var val = this[key];
            if(typeof val == "object"){
                val = JSON.stringify(val);
            }
            outObj[key] = val;
        }
        return outObj;
    }
};

XAPISearchHelper = function(){
   this.getActor = function(){
        var actor = null;
        var actorEmail = this.getSearchVar("UserToSearch");
           if(actorEmail != null){
                actor = (actor == null) ? new Object() : actor;
                if(actorEmail.indexOf('mailto:') == -1){
                    actorEmail = 'mailto:'+actorEmail;
                }
                actor["mbox"] = actorEmail;
            }
        return actor;
    };
    
    this.getVerb = function(){
        verb = null;
        var id = this.getSearchVar("verb");
        if(id != null){
           verb = id;
        }
        return verb
    };
    
    this.getObject = function(){
        var obj = null;
        var objectJson = this.getSearchVar("objectJson");
        if(objectJson != null){
            obj = JSON.parse(objectJson);
        }else{
            var activityId = this.getSearchVar("activityId");
            if(activityId != null){
                obj = activityId;
            }
        }
        return obj;
    };
    
    this.getRegistration = function(){
        return this.getSearchVar("registration");
    };
    
    this.getSince = function(){
        var since = this.getSearchVar("since");
        return since;
    };
    
    this.getUntil = function(){
        var until = this.getSearchVar("until");
        return until;
    };
    
    this.dateStrIncludesTimeZone = function(str){
        return str != null && (str.indexOf("+") >= 0 || str.indexOf("Z") >= 0); 
    };
    
    this.nonEmptyStringOrNull = function(str){
        return (str != null && str.length > 0) ? str : null;
    };
    
    this.getSearchVar = function(searchVarName, defaultVal){
        var myVar = $("#"+searchVarName).val();
        if(myVar == null || myVar.length < 1){
            return defaultVal;
        }
        return myVar;
    };
    
    this.getSearchVarAsBoolean = function(searchVarName, defaultVal){
        return $("#"+searchVarName).is(":checked");
    };
};

XAPIFormHelper = function(){
    this.copyQueryStringToForm = function(){
        var booleanVals = ["context", "authoritative", "sparse"];
        var qsMap = this.getQueryStringMap();
        for(var key in qsMap){
            var inputType = ($.inArray(key, booleanVals) >= 0) ? "checkbox" : "text";
            this.setInputFromQueryString(key, qsMap[key], inputType);
        }
    };
    
    this.setInputFromQueryString = function(name, val, inputType){
        if(inputType == null){
            inputType = "text";
        }
        if(val != null){
            if(inputType == "text"){
                $("#"+name).val(val);
            }
            else if (inputType == "checkbox"){
                if(val == "true"){
                    $("#"+name).attr('checked', 'checked');
                }else{
                    $("#"+name).removeAttr('checked');
                }
            }
        };
    };
    
    this.getQueryStringMap = function(){
        var qs = window.location.search;
        if(qs == null || qs.length < 1){
            return [];
        }
        if(qs.indexOf("#") > 0){
            qs = qs.substring(0, qs.indexOf("#"));
        }
        qs = qs.substring(1, qs.length);
        var nameVals = qs.split("&");
        var qsMap = {};
        for(var i = 0; i < nameVals.length; i++){
            var keyVal = nameVals[i].split("=");
            qsMap[keyVal[0]] = decodeURIComponent(keyVal[1].replace(/\+/g, " "));
        }
        return qsMap;
    };
};
searchStatements = function(){
    var helper = new this.XAPISearchHelper(); 
    var queryObj = new this.XAPIStatementQueryObject();

    queryObj.agent = helper.getActor();
    queryObj.verb = helper.getVerb();
    queryObj.activity = helper.getObject();
    queryObj.registration = helper.getRegistration();
    queryObj.since = helper.getSince();
    queryObj.until = helper.getUntil();
    queryObj.format = "exact";

    var url = this.getEndpoint() + "statements?" + queryObj.toString();
    $("#XAPIQueryText").text(url);

    this.getStatements(queryObj.toObj(), this.getCallback(this.renderStatementsHandler));
};

renderStatementsHandler = function(xhr){
    this.renderStatements(JSON.parse(xhr.responseText));
};
renderStatements = function(statementsResult) {
	var statements = statementsResult.statements;
	var stmt;
     	var verb;
	//var Memory
	var numSuccesses=0;
	var numFailures=0;
	var score=0;
	var endTime;
	var initialTime;
	var numClicks=0;
	var finalScore=0;
	var time;
	//var Castle
	var numSuccessesOp=0;
	var numFailuresOp=0;
	var numSuccessesArr=0;
	var numFailuresArr=0;
	var scoreCD=0;
	var endTimeCD;
	var initialTimeCD;
	var finalScoreCD=0;
	var timeCD;
	var loseLife=0;
	var numlevel=0;

	for (i = 0; i < statements.length; i++) {
        	stmt = statements[i];
		verb = getVerb(stmt.verb);
		game=statements[i].object.id;
		if(game==("act:adlnet.gov/Memory")){
			if(verb=="correct"){	
				numSuccesses++;
			}else if(verb=="failed"){
				numFailures++;	
			}else if(verb=="clicked"){
				numClicks++;
			}else if(verb=="finished the level"){
				score+=stmt.result.score.raw;
			}else if(verb=="started"){
				initialTime=stmt.timestamp;
			}else if(verb=="finished"){
				endTime=stmt.timestamp;
			}
		}else{
			if(verb=="correct"){	
				activity=getActivity(stmt);
				if (activity== "http://minigame.co.nf/arrow"){
					numSuccessesArr++;
				}else{
					numSuccessesOp++;
				}
			}else if(verb=="failed"){
				activity=getActivity(stmt);
				if (activity== "http://minigame.co.nf/arrow"){
					numFailuresArr++;
				}else{
					numFailuresOp++;
				}	
			}else if(verb=="finished the level"){
				scoreCD+=stmt.result.score.raw;
				numlevel++;
			}else if(verb=="started"){
				initialTimeCD=stmt.timestamp;
			}else if(verb=="finished"){
				endTimeCD=stmt.timestamp;
			}
			else if(verb=="lose life"){
				loseLife++;
			}
	
		}

     	}
     	var stmtStr = new Array();
	if ((initialTime)!=null &&(endTime)!=null){
	aDate = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(initialTime);
        dtini = new Date(Date.UTC(aDate[1], aDate[2]-1, aDate[3], aDate[4], aDate[5], aDate[6]));
	aDate2 = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(endTime);
        dtfin = new Date(Date.UTC(aDate2[1], aDate2[2]-1, aDate2[3], aDate2[4], aDate2[5], aDate2[6]));
	finalScore = dtfin-dtini;
	time=dameFecha(finalScore);
	}
	if ((initialTimeCD)!=null &&(endTimeCD)!=null){
	aDateCD = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(initialTimeCD);
        dtiniCD = new Date(Date.UTC(aDateCD[1], aDateCD[2]-1, aDateCD[3], aDateCD[4], aDateCD[5], aDateCD[6]));
	aDate2CD = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(endTimeCD);
        dtfinCD = new Date(Date.UTC(aDate2CD[1], aDate2CD[2]-1, aDate2CD[3], aDate2CD[4], aDate2CD[5], aDate2CD[6]));
	finalScoreCD = dtfinCD-dtiniCD;
	timeCD=dameFecha(finalScoreCD);
	}
	$("#Name").append( statements[1].actor.name);
	$("#Succes").append(numSuccesses);
	$("#Fallos").append(numFailures);
	$("#Clicks").append(numClicks);
	$("#Score").append(score);
	if (time!=null){
	$("#Time").append(time);
	}else{
	$("Time").append("No ha terminado el juego");
	}

	$("#Name2").append( statements[1].actor.name);
	$("#SuccesOp").append(numSuccessesOp);
	$("#FallosOp").append(numFailuresOp);
	$("#SuccesArr").append(numSuccessesArr);
	$("#FallosArr").append(numFailuresArr);
	$("#lostlife").append(loseLife);
	$("#numlevel").append(numlevel);
	$("#Score2").append(scoreCD);
	if (timeCD!=null){
	$("#Time2").append(timeCD);
	}else{
	$("Time2").append('No ha terminado el juego');
	}
};

dameFecha=function(result){

	var dias=((result/1000)/86400)|0;
	result=((result/1000)%86400);
	var horas=(result/3600)|0;
	result=result%3600;
	var minu=(result/60)|0;
	var seg=result%60; 
	str="";
	if(dias>1){
		str+="Dias: "+ dias;
	}
	if(horas<10){
		str+="0"+horas+ ":";
	}else{
		str+=horas+ ":";
	}
	if(minu<10){
		str+="0"+minu+ ":";
	}else{
		str+=minu+ ":";
	}if(seg<10){
		str+="0"+seg;
	}else{
		str+=seg;
	}
	return str;	
}

getStatements = function(queryObj, callback){
     ADL.XAPIWrapper.getStatements(queryObj, null, callback);
};

function GetStatementsWithinContext (num, verb, activityId, callbackFunction, nextPage) {
    GetStatements(num, verb, activityId, callbackFunction, nextPage, true);
}

function GetStatements (num,verb,activityId,callbackFunction, nextPage, isContextActivity) {
    if (nextPage && moreStatementsUrl !== null && moreStatementsUrl !== undefined){
        ADL.XAPIWrapper.getStatements(null, moreStatementsUrl, callbackFunction);
    } 
    else{
        var params = ADL.XAPIWrapper.searchParams();
        if (num > 0){
            params["limit"] = num;
        }
        if (verb != null){
            params["verb"] = verb;
        }
        if (activityId != null){
            params["activity"] = activityId;
        }
        if(isContextActivity){
            params["related_activities"] = "true";
        }
       
        ADL.XAPIWrapper.getStatements(params, null, callbackFunction);
    }
}

function GetActivityProfile (activityId, profileKey, callbackFunction) {
       ADL.XAPIWrapper.getActivityProfile(activityId, profileKey, null, callbackFunction, null, true);
}

function getActorName(actor) {
    if (actor === undefined) {
        return "";
    }
    if (actor.name !== undefined) {
        return actor.name;
    }
    if (actor.mbox !== undefined) {
        return actor.mbox;
    }
    if (actor.account !== undefined) {
        return actor.account.name;
    }
    return truncateString(JSON.stringify(actor), 20);
}

function getVerb(verb) {
    if (verb === undefined) {
        return "";
    }
    if (verb.display["en-US"] !== undefined) {
        return verb.display["en-US"];
    }
    if (verb.id !== undefined) {
        return verb.id;
    }
    return truncateString(JSON.stringify(verb), 20);
}

function getActivity(stmt) {	
	activity=stmt.context.contextActivities.category[0].id;
        return activity;
}

function getTargetDesc(obj) {
    if (obj.objectType !== undefined && obj.objectType !== "Activity") {
        return getActorName(obj);
    }
    if (obj.definition !== undefined) {
        if (obj.definition.name !== undefined) {
            if (obj.definition.name["und"] !== undefined) {
                return obj.definition.name["und"];
            }
            return obj.definition.name["en-US"];
        }
        if (obj.definition.description !== undefined) {
            if (obj.definition.description["und"] !== undefined) {
                return truncateString(obj.definition.description["und"], 48);
            }
            return truncateString(obj.definition.description["en-US"], 48);
        }
    }
    return obj.id;
}

function truncateString(str, length) {
    if (str == null || str.length < 4 || str.length <= length) {
        return str;
    }
    return str.substr(0, length - 3) + '...';
}

function RenderStatements(xhr){
    var statementsResult = JSON.parse(xhr.responseText);
    var statements = statementsResult.statements;
    moreStatementsUrl = statementsResult.more;
    if(moreStatementsUrl === undefined || moreStatementsUrl === null || moreStatementsUrl === ""){
        $("#showAllStatements").hide();
    }
    else{
        $("#showAllStatements").show();     
    }
    var stmtStr = "<table>";
    var i;
    var dt;
    var aDate;
    if (statements !== undefined && statements !== ""){
        if (statements.length > 0) {
            if (!firstStored) {
                firstStored = statements[0].stored;
            }
        }
        for (i = 0; i < statements.length ; i++){
            stmtStr += "<tr class='statement' tcid='" + statements[i].id + "'>";
            aDate = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(statements[i].stored);
            dt = new Date(Date.UTC(aDate[1], aDate[2]-1, aDate[3], aDate[4], aDate[5], aDate[6]));  
            stmtStr += "<td class='date'>"+ dt.toLocaleDateString() + " " + dt.toLocaleTimeString()  +"</td>";
            stmtStr += "<td > <span class='actor'>"+ getActorName(statements[i].actor) +"</span>";
            var verb = getVerb(statements[i].verb);
            var obj = getTargetDesc(statements[i].object);
            if (statements[i].object.definition != undefined){
                var activityType = statements[i].object.definition.type;
                if (activityType != undefined && (activityType == "question" || activityType == "interaction")){
                    obj = (statements[i].object.definition.description != undefined) ? statements[i].object.definition.description["en-US"] : obj;
                    var answer = "";
                    var corrAnswer = "";
                    if (statements[i].result != undefined){
                        if (statements[i].result.success != undefined){
                            stmtStr += " <span class='score'>"+ ((statements[i].result.success)?"correctly":"incorrectly") +"</span>";
                            if (!statements[i].result.success && statements[i].object.definition.correct_responses != undefined){
                                corrAnswer = " The correct response is '" + statements[i].object.definition.correct_responses + "'.";
                            }
                        }
                        if (statements[i].result.response != undefined){
                            answer = " with response '" + statements[i].result.response + "'.";
                        }
                        
                        
                    }

                    stmtStr += " <span class='verb'>"+ verb +"</span>";
                    stmtStr += " <span class='object'>'"+ obj +"'</span>";
                    stmtStr += (answer != "")? answer : ".";
                    stmtStr += corrAnswer;
                    
                }else if(verb == "experienced" && statements[i].object.definition.type != undefined && statements[i].object.definition.type == "Location"){
                    
                    stmtStr += " <span class='verb'>visited</span>";
                    obj = (statements[i].object.definition.name != undefined) ? statements[i].object.definition.name["en-US"] : obj;
                    stmtStr += " <span class='object'>"+ obj +"</span>";
                    
                    if(statements[i].context.extensions.latitude != null && statements[i].context.extensions.longitude != null){
                        stmtStr += " (latitude: "+ 
                                        statements[i].context.extensions.latitude +
                                        ", longitude: " + 
                                        statements[i].context.extensions.longitude + ")";
                    }
                }else {
                    stmtStr += " <span class='verb'>"+ verb +"</span>";
                    obj = (statements[i].object.definition.name != undefined) ? statements[i].object.definition.name["en-US"] : obj;
                    stmtStr += " <span class='object'>"+ obj +"</span>";
                }
            }else{
                stmtStr += "&nbsp;<span class='verb'>"+ verb +"</span>&nbsp;<span class='object'>"+ obj +"</span>";
            }
            if (statements[i].result != undefined){
                if (statements[i].result.score != undefined && statements[i].result.score.raw != undefined){
                    stmtStr += "  <span class='score'> with score "+ statements[i].result.score.raw +"</span>";
                }
            }
            stmtStr += "<div class='tc_rawdata' tcid_data='" + statements[i].id + "'><pre>" + JSON.stringify(statements[i], null, 4) + "</pre></div>";
            stmtStr += "</td></tr>";
	}
    }
    stmtStr += "</table>";
    $("#theStatements").append(stmtStr);
    $('tr[tcid]').click(function(){
        $('[tcid_data="' + $(this).attr('tcid') + '"]').toggle();
    })
}

function RenderHighScores(xhr){
    var scores = JSON.parse(xhr.responseText);
    var playerScores = new Object();
	

    if (scores.length > 0){
        $("#MemoryHighScoreData").empty();
    }
    
    html = "<table>";
    var num=scores.length;
    if(scores.length>10){
	num=10;
    }
   var pos=0;
   for(i=0;i < num;i++){
	var name = (scores[i].actor.name != undefined) ? scores[i].actor.name : scores[i].actor.mbox;
	var email=scores[i].actor.mbox;
	if (playerScores[email] == undefined ){
		playerScores[email] = new Object();
        	html += "<tr class='highScoreRow'><td class='scoreRank'>" + (pos+1) + "</td>";
        	html += " <td class='actor'>M</td>";
	        html += " <td class='score'>"+ scores[i].score +"</td>";
	        html += "</tr>";
		pos++;
	}
   }
   html += "</table>";
   $("#MemoryHighScoreData").append(html);
}

function RenderHighScoresCD(xhr){
    var scores = JSON.parse(xhr.responseText);
    var playerScores = new Object();
    if (scores.length > 0){
        $("#CastleDefenseHighScoreData").empty();
    }
    html = "<table>";
    var num=scores.length;
     if(scores.length>10){
	num=10;
    }
    var pos=0;
    for( i=0;i < num;i++){
	var name = (scores[i].actor.name != undefined) ? scores[i].actor.name : scores[i].actor.mbox;
	var email=scores[i].actor.mbox;
	if (playerScores[email] == undefined ){
		playerScores[email] = new Object();
	        html += "<tr class='highScoreRow'><td class='scoreRank'>" + (pos+1) + "</td>";
	        html += " <td class='actor'>M</td>";
	        html += " <td class='score'>"+ scores[i].score +"</td>";
		html += "</tr>";
		pos++;
	}
   }
   html += "</table>";
   $("#CastleDefenseHighScoreData").append(html);
}

function RenderMediaData(xhr){
    var statements = JSON.parse(xhr.responseText).statements;
    var playerScores = new Object();
    var players = new Array();
    var scores = new Array();
    var emails = new Array();
    var maxScore = 0;
    for (var i = 0; i < statements.length ; i++){
        var name = (statements[i].actor.name != undefined) ? statements[i].actor.name : statements[i].actor.mbox;
        var email = statements[i].actor.mbox;
        if (playerScores[email] == undefined ){
		playerScores[email] = new Object();
		playerScores[email].nombre=name;
		playerScores[email].aciertos=0;
		playerScores[email].fallos=0;
		playerScores[email].numlevel=0;
		playerScores[email].score=0;
		playerScores[email].finished=false;
 		players.push(name);
		emails.push(email);
	}
	verb = getVerb(statements[i].verb);
	if(verb=="correct"){	
		playerScores[email].aciertos++;
	}else if(verb=="failed"){
		playerScores[email].fallos++;	
	}else if(verb=="finished the level"){
		playerScores[email].score+=statements[i].result.score.raw;
		playerScores[email].numlevel++;	
	}else if(verb=="started"){
		playerScores[email].initialTime=statements[i].timestamp;	
	}else if(verb=="finished"){
		playerScores[email].finished=true;
		playerScores[email].endTime=statements[i].timestamp;
	}
    }
    var addScore=0;
    var addTime=0;
    var sumOk=0;	
    var sumFail=0;
    var totalstart=players.length;
    var totalfinish=0;
    var mini=999999999999999;
    var nameMin="";
    var result;
    for(i=0;i<players.length;i++){
	//score
	addScore+=playerScores[emails[i]].score;
	//Time
	if (playerScores[emails[i]].finished){
		totalfinish++;
		aDate = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(playerScores[emails[i]].initialTime);
        	dtini = new Date(Date.UTC(aDate[1], aDate[2]-1, aDate[3], aDate[4], aDate[5], aDate[6]));
		aDate2 = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(playerScores[emails[i]].endTime);
        	dtfin = new Date(Date.UTC(aDate2[1], aDate2[2]-1, aDate2[3], aDate2[4], aDate2[5], aDate2[6]));
		result= dtfin-dtini;
		if(result<mini){
			mini=result;
			nameMin=playerScores[emails[i]].nombre;
		}
	}
	addTime+=result;
	//Correct
	sumOk+=playerScores[emails[i]].aciertos;
	//Failed
	sumFail+=playerScores[emails[i]].fallos;
    }
    var total=players.length;
    $("#MediaScore").append(addScore/total);
    $("#MediaTime").append(dameFecha(addTime/total));
    $("#MediaCorrect").append(sumOk/total);
    $("#MediaFailed").append(sumFail/total);
    if (mini!=""){
	$("#StudentFast").append(nameMin+" "+dameFecha(mini));
    }else{
	$("#StudentFast").append("no student has completed the game");
    }
	$("#StudentStarted").append(totalstart);
	$("#StudentFinished").append(totalfinish);
    }

function RenderMediaDataCD(xhr){
    var statements = JSON.parse(xhr.responseText).statements;
    var playerScores = new Object();
    var players = new Array();
    var scores = new Array();
    var emails = new Array();
    var maxScore = 0;
    for (var i = 0; i < statements.length ; i++){
        var name = (statements[i].actor.name != undefined) ? statements[i].actor.name : statements[i].actor.mbox;
        var email = statements[i].actor.mbox;
        if (playerScores[email] == undefined ){
		playerScores[email] = new Object();
		playerScores[email].nombre=name;
		playerScores[email].aciertosOp=0;
		playerScores[email].aciertosArr=0;
		playerScores[email].fallosOp=0;
		playerScores[email].fallosArr=0;
		playerScores[email].score=0;
		playerScores[email].finished=false;
		playerScores[email].loselife=0;	
		playerScores[email].numLevel=0;		
 		players.push(name);
           	emails.push(email);
	}
	verb = getVerb(statements[i].verb);
		if(verb=="correct"){	
			activity=getActivity(statements[i]);
			if (activity== "http://minigame.co.nf/arrow"){
				playerScores[email].aciertosArr++;
			}else{
				playerScores[email].aciertosOp++;
			}
		}else if(verb=="failed"){
			activity=getActivity(statements[i]);
			if (activity== "http://minigame.co.nf/arrow"){
				playerScores[email].fallosArr++;	
			}else{
				playerScores[email].fallosOp++;	
			}	
		}else if(verb=="finished the level"){
			playerScores[email].score+=statements[i].result.score.raw;
			playerScores[email].numLevel++;	
		}else if(verb=="started"){
			playerScores[email].initialTime=statements[i].timestamp;
		}else if(verb=="finished"){
			playerScores[email].finished=true;
			playerScores[email].endTime=statements[i].timestamp;
		}else if(verb=="lose life"){
			playerScores[email].loselife++;	
		}
	
        
    }
    var addScore=0;
    var addTime=0;
    var addOkOp=0;	
    var addFailOP=0;
    var addOkArr=0;	
    var addFailArr=0;
    var addLifeLose=0;
    var totalstart=players.length;
    var totalfinish=0;
    var totallevel = new Array();
    var mini=999999999999999;
    var nameMin="";
    var result;
    for(i=0;i<10;i++){
	totallevel.push(0);	
    }
    for(i=0;i<players.length;i++){
	//score
	addScore+=playerScores[emails[i]].score;
	//Time
	if (playerScores[emails[i]].finished){
		totalfinish++;
		aDate = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(playerScores[emails[i]].initialTime);
            	dtini = new Date(Date.UTC(aDate[1], aDate[2]-1, aDate[3], aDate[4], aDate[5], aDate[6]));
		aDate2 = /^(\d{4})-(\d{2})-(\d{2}).(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)/.exec(playerScores[emails[i]].endTime);
            	dtfin = new Date(Date.UTC(aDate2[1], aDate2[2]-1, aDate2[3], aDate2[4], aDate2[5], aDate2[6]));
		result= dtfin-dtini;
		if(result<mini){
			mini=result;
			nameMin=playerScores[emails[i]].nombre;
		}
    	}

	addTime+=result;
	//Correct Operations
	addOkOp+=playerScores[emails[i]].aciertosOp;
	//Failed Operations
	addFailOP+=playerScores[emails[i]].fallosOp;
	//Correct Arrows
	addOkArr+=playerScores[emails[i]].aciertosArr;
	//Failed Arrows
	addFailArr+=playerScores[emails[i]].fallosArr;
	//Life Lost
	addLifeLose+=playerScores[emails[i]].loselife;
	//total Level
	totallevel[playerScores[emails[i]].numLevel-0]++;  
    }
    var total=players.length;
    $("#CastleDefenseMediaScore").append(addScore/total);
    $("#CastleDefenseMediaTime").append(dameFecha(addTime/total));
    $("#CastleDefenseMediaCorrectOp").append(addOkOp/total);
    $("#CastleDefenseMediaCorrectArr").append(addOkArr/total);
    $("#CastleDefenseMediaFailedOp").append(addFailOP/total);
    $("#CastleDefenseMediaFailedArr").append(addFailArr/total);
    $("#CastleDefenseMedialifelost").append(addLifeLose/total);
    if (mini!=""){
	$("#CastleDefenseStudentFast").append(nameMin+" "+dameFecha(mini));
    }else{
	$("#CastleDefenseStudentFast").append("no student has completed the game");
    }
    $("#CastleDefenseStudentStarted").append(totalstart);
    $("#CastleDefenseStudentFinished").append(totalfinish);
    $("#CastleDefenseStudentlevel1").append(totallevel[1]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel2").append(totallevel[2]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel3").append(totallevel[3]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel4").append(totallevel[4]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel5").append(totallevel[5]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel6").append(totallevel[6]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel7").append(totallevel[7]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel8").append(totallevel[8]*100/totalstart+" %");
    $("#CastleDefenseStudentlevel9").append(totallevel[9]*100/totalstart+" %");
}

function RenderTetrisScoreChart(xhr){
    var statements = JSON.parse(xhr.responseText).statements;
    var playerScores = new Object();
    var players = new Array();
    var scores = new Array();
    var emails = new Array();
    var maxScore = 0;
    
    for (var i = 0; i < statements.length ; i++){
        var name = (statements[i].actor.name != undefined) ? statements[i].actor.name : statements[i].actor.mbox;
        var email = statements[i].actor.mbox;
        var score = (statements[i].result != undefined 
            && statements[i].result.score != undefined 
            && statements[i].result.score.raw != undefined) ? statements[i].result.score.raw : 0;
        
        if (playerScores[name] !== undefined && emails.indexOf(email) > -1){
            if (score > playerScores[name].score){
                playerScores[name].score = score;
                playerScores[name].count = 1;
                scores[playerScores[name].index] = score;
            }else{
                playerScores[name].count++;
            } 
        }else{
            playerScores[name] = new Object();
            playerScores[name].score = score;
            playerScores[name].index = scores.push(score)-1;
            playerScores[name].count = 1;
            players.push(name);
            emails.push(email);
        }
    }
    
    var height = (players.length * 40) + 50;
    
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Player');
    data.addColumn('number', 'Score');
    data.addRows(players.length);
    for (i = 0; i < players.length;i++){
        data.setCell(i,0,players[i]);
        data.setCell(i,1,scores[i]);
    }
    // Set chart options
    var options = {'title':'Tetris Personal Best Scores',
                     'width':960,'height':height,
                    titleTextStyle: {fontSize: 14} };

     // Instantiate and draw our chart, passing in some options.
     var chart = new google.visualization.BarChart(document.getElementById('tetrisScoresChart'));
     chart.draw(data, options);
}
