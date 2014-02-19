

$("#pdef").live('pageshow', function(event, data) {
    //alert("the previous page was: " + data.prevPage.attr('id'));
    previouspage = data.prevPage.attr('id');
    if(previouspage!='pdef')
    	previous_synsetid = "pnull"
});



function load_pdef(def){

	refresh_pdef(def);
	
}

function toogle_sense(senseid,word){
	
	pdef_tick = 1;
	if(db == "")
		db = window.sqlitePlugin.openDatabase("new_lexitree", "1.0", "new_lexitree.db", -1);

	var wordid; 
	
	db.transaction(function(tx) {
		
		tx.executeSql("SELECT wordid  FROM words WHERE lemma = '"+word+"';", [], function(tx, res1) {
			
			//TODO LANG_QUESTION
			//tx.executeSql("SELECT wordid  FROM words WHERE lemma = '"+word+"';", [], function(tx, reslang) {
				
				if(res1.rows.length == 0){
					alert('wordid not found at toggle sense');
				}
					
			   wordid = res1.rows.item(0).wordid;
			   
				tx.executeSql("SELECT synsetid,ssenseid FROM selected_senses WHERE synsetid = '"+senseid+"' AND wordid='"+wordid+"' AND dtime IS NULL;", [], function(tx, res2) {
					var d = new Date();
					var n = d.getTime();
					if(res2.rows.length == 0){
						//if(previous_synsetid != "pnull"){
						//	toast("chained!");
						//	console.log("insert into selected_senses(wordid,synsetid,ctime,previous_synsetid,correct,incorrect,original_lang) values  ('"+wordid+"', '"+senseid+"', '"+n+"', '"+previous_synsetid+"' , '"+0+"', '"+0+"',(select langquestion from subjects where subjectid=( select subjectid from global_vars where user='default' )));");
						//	tx.executeSql("insert into selected_senses(wordid,synsetid,ctime,previous_synsetid,correct,incorrect,original_lang) values  ('"+wordid+"', '"+senseid+"', '"+n+"', '"+previous_synsetid+"' , '"+0+"', '"+0+"',(select langquestion from subjects where subjectid=( select subjectid from global_vars where user='default' )));");
						
						//}else{
							//toast("unchained!");
							console.log("insert into selected_senses(wordid,synsetid,ctime,correct,incorrect) values  ('"+wordid+"', '"+senseid+"', '"+n+"', '"+0+"', '"+0+"');");	
						  tx.executeSql("insert into selected_senses(wordid,synsetid,ctime,correct,incorrect) values  ('"+wordid+"', '"+senseid+"', '"+n+"', '"+0+"', '"+0+"');");	
						//}
						
						tx.executeSql("insert into subject_sets(subjectid,ssenseid) select t1.subjectid, t2.ssid from ( select subjectid from global_vars where user='default') as t1 CROSS JOIN (select max(ssenseid) as ssid from selected_senses) as t2;");
							
					}else{
						tx.executeSql("UPDATE selected_senses SET dtime = "+n+" where ssenseid ='"+res2.rows.item(0).ssenseid+"' ;");
					}
				//});
			});
		});
	});
	
}

function special_word(word,psid){
	
	if( specialword == word ){

		previous_synsetid = psid;
		load_pdef(word);
		return;
	}
	
	specialword=word;
	
	refresh_pdef(word_pdef);
	
}

function format_definition(def,psid){
	
	var result="";
	
	if(def.substring(0,2)=="NT"){
		result='<span style="color:DarkGrey">';
		def=def.substring(2);
	}else
		result="<span>";
		
	var words=def.camelize().split(" ");
	
	for(var i=0;i<words.length;i++){
		
		if(words[i]==specialword)
			result+='<span class="word_to_search_e" id="'+words[i]+'" psid="'+psid+'">'+words[i]+"</span> ";
		else
			result+='<span class="word_to_search_c" id="'+words[i]+'">'+words[i]+"</span> ";
	}
	return result.substr(0,result.length-1)+".</span>";
}

function refresh_pdef(original_word){
	
	original_word = original_word.camelize(true);
	var sing = original_word.singularize();
	
	db.transaction(function(tx) {
		tx.executeSql("SELECT wordid  FROM words WHERE lemma = '"+original_word+"';", [], function(tx, res1) {
			if(res1.rows.length == 0){ //TODO: and lang_question == eng
				refresh_pdef_big(sing);
			}else
				refresh_pdef_big(original_word);
		});
	});
}

function refresh_pdef_big(word){

	//alert(word);
	word_pdef = word;

	if(word=="" || word==undefined )
		return;
	var def= "error";
	
	if(db == "")
		db = window.sqlitePlugin.openDatabase("new_lexitree", "1.0", "new_lexitree.db", -1);

	var wordid; 
	
	db.transaction(function(tx) {
		
		
		tx.executeSql("SELECT wordid  FROM words WHERE lemma = '"+word+"';", [], function(tx, res1) {
			if(res1.rows.length == 0){
				toast('Sorry,word not found');
				return;
			}
				
		   wordid = res1.rows.item(0).wordid;
		
			tx.executeSql("select langquestion, langanswer from subjects left join global_vars using(subjectid) where user='default'", [], function(tx, reslangsubject){
				var lang_question = reslangsubject.rows.item(0).langquestion;
			    var lang_answer   = reslangsubject.rows.item(0).langanswer;
			   
				tx.executeSql("SELECT synsetid  FROM selected_wordsXsenses WHERE wordid = '"+wordid+"' AND dtime IS NULL;", [], function(tx, res2) {
		
					senses = [];
			        for(var i=0 ; i<res2.rows.length ; i++){
			        	senses.push(res2.rows.item(i).synsetid);
			   	    }     
			        var question="";
			        
			        if(lang_question=="eng")
			        	question = "SELECT posname,synsetid,definition  FROM dict LEFT JOIN postypes USING(pos) WHERE lemma = '"+word+"' ORDER BY posname;";
			        else
			        	question = "select synsetid,definition,posname FROM words left join lang_synsets s using(wordid) left join synsets using(synsetid) left join postypes p on s.pos=p.pos where lemma='"+word+"' and lang='"+lang_question+"'";
			        
			        if(lang_answer == "eng_def"){
			    		tx.executeSql(question, [], function(tx, res){
			    			print_res_def(res,senses,word);
			    		 });
		        		return;
		        	}else{
		        		tx.executeSql(question, [], function(tx, res){
				    		fill_definitions(0,res,print_res_def,senses,word,tx,lang_answer);
		        		 });
		        		return;
		        	}     
				});
			});
		});
	});

}

function fill_definitions(i,res,callback,senses,word,tx,lang_answer){
	if(i==res.rows.length){
		callback(res,senses,word);
		return;
	}
	console.log(res.rows.item(i).synsetid);
	tx.executeSql("select lemma,synsetid,lang from lang_lemmas left join synsets using(synsetid) where synsetid="+res.rows.item(i).synsetid+" AND lang='"+lang_answer+"';", [], function(tx, reslang){
		if(reslang.rows.length != 0){
			var newdef = '';
			for(var j=0; j<reslang.rows.length; j++){
				//alert("one"+reslang.rows.item(0).lemmalang);
				newdef+=', '+reslang.rows.item(j).lemma;
			}
			res.rows.item(i).definition = newdef.substring(2);
		}else
			res.rows.item(i).definition = "NT"+res.rows.item(i).definition;
		
		
		fill_definitions(i+1,res,callback,senses,word,tx,lang_answer);
	});
}

function print_res_def(res,senses,word){
	
  if( res.rows.length == 0 ){
	toast('Sorry,word not found');
   	return;
   }
   def = '';
   var posname = 'notknown';
   for(var i=0 ; i<res.rows.length ; i++){
	   	
	   	if(posname != res.rows.item(i).posname){
	   		posname = res.rows.item(i).posname;
	   		def += '<li data-role="list-divider" ><a>'+posname+'</a></li>';
	   	}
	   	
	   	var synsetid = res.rows.item(i).synsetid;
	   	if( -1 != $.inArray(res.rows.item(i).synsetid, senses)){
	   		   def += '<li data-icon="check" data-theme="e"><a><span id="defline">'+format_definition(res.rows.item(i).definition,synsetid)+'</span></a><a class="tick_sense" word="'+word+'" sense="'+res.rows.item(i).synsetid+'" >tick</a></li>';
	    }else{
    	   synsetid = "pnull";
    	   def += '<li data-icon="check" data-theme="d"><a><span id="defline">'+format_definition(res.rows.item(i).definition,synsetid)+'</span></a><a class="tick_sense" word="'+word+'" sense="'+res.rows.item(i).synsetid+'" data-theme="d" data-icon="plus" >tick</a></li>';
	    }
    }
	
   if(specialword == word && pdef_tick == 0)
   	$.mobile.changePage( "index.html#pdef", { transition: "slidefade" , allowSamePageTransition: true} );
   else
   	$.mobile.changePage( "index.html#pdef", { transition: "slide"} );

   pdef_tick = 0
    new_word_pdef = 1;
    
	$('#pdef_def').html(def).promise().done(function () {
		   //refresh here - $(this) refers to ul here
		   $(this).listview().listview("refresh");
		   //causes a refresh to happen on the elements such as button etc. WHICH lie inside ul
		   $(this).trigger("create");
		   //$.mobile.changePage( "index.html#pdef", { transition: "slide" , allowSamePageTransition: true} );   
		});
	document.getElementById("pdef_word").innerHTML = word.camelize();
}