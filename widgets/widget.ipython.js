(function () {
    widget = Retina.Widget.extend({
        about: {
                title: "iPython Widget",
                name: "ipython",
                author: "Tobias Paczian",
                requires: [ ]
        }
    });
    
    widget.setup = function () {
	return [ Retina.add_renderer({"name": "listselect", "resource": "./",  "filename": "renderer.listselect.js" }),
		 Retina.load_renderer("listselect"),
		 Retina.add_renderer({"name": "graph", "resource": "./",  "filename": "renderer.graph.js" }),
		 Retina.load_renderer("graph"),
	         stm.get_objects({ "type": "metagenome", "options": { "verbosity": "full", "limit": 1 } })
	       ];
    };

    widget.cellnum = 0;
    
    widget.display = function (params) {	

	var content = params.target;

	var master_table = document.createElement('table');
	master_table.setAttribute('style', "width: 94%; margin-left: 3%; margin-top: 50px;");
	var line = document.createElement('tr');
	var leftside = document.createElement('td');
	leftside.setAttribute('style', "width: 50%; vertical-align: top;");
	var rightside = document.createElement('td');
	line.appendChild(leftside);
	line.appendChild(rightside);
	master_table.appendChild(line);
	content.appendChild(master_table);

	var loader = document.createElement('input');
	loader.setAttribute('type', 'file');
	loader.setAttribute('style', "position: absolute; top: 0px; left: 0px;");
	loader.addEventListener('change', function(event){
	    stm.file_upload(event, widget.loadSelector)
	}, false);
	content.appendChild(loader);
	
	// left side
	var ls_title = document.createElement('div');
	ls_title.innerHTML = "<h3>select a metagenome</h3>";
	leftside.appendChild(ls_title);

	var ls = document.createElement('div');
	leftside.appendChild(ls);

	var listrend = Retina.Renderer.create('listselect', {
	    target: ls,
	    multiple: false,
	    data: [],
	    value: "id",
	    label: "name",
	    filter: [ "name", "id", "biome", "project",  "pi" ],
	    callback: function (data) {
		var senddata = "# the user selected the metagenome "+stm.DataStore.metagenome[data].name+"\nmetagenome_id = '" + data + "'";
		widget.transfer(senddata, 0);
	    }
	});
	listrend.render();

	var pull_btn = document.createElement('input');
	pull_btn.setAttribute('type', 'button');
	pull_btn.setAttribute('class', 'btn');
	pull_btn.setAttribute('style', "margin-left: 20px; margin-top: 20px; margin-bottom: 20px;");
	pull_btn.setAttribute('value', 'load statistical data');
	pull_btn.addEventListener('click', function(event){
	    var command = "# initializing api url\napi = 'http://api.metagenomics.anl.gov/api2.cgi'\n\n# retrieving statistical data\nstats_json = ! wget -q -O - '\$api/metagenome_statistics/\$metagenome_id'\n\n# converting json data to python\nstats_data = json.loads( stats_json[0] )";
	    widget.transfer(command, 1);
	});
	leftside.appendChild(pull_btn);

	var info_title = document.createElement('div');
	info_title.innerHTML = "<h3>select a statistical info to display</h3>";
	
	var info_sel = document.createElement('select');
	info_sel.innerHTML = "<option>- please select -</option><option>domain distribution</option><option>sequence distribution</option>";
	info_sel.addEventListener('change', function(event) {
	    var command = "";
	    if (this.options[this.selectedIndex].value == 'domain distribution') {
		command = "# selecting domain data\ndata = stats_data['domain']\ntitle = 'domain distribution'";
	    } else {
		command = "# selecting similarity data\ndata = stats_data['sims']\ntitle = 'sequence distribution'";
	    }
	    command += "\n\n# formatting data\ngraph_data = []\nfor item in data:\n\tgraph_data.append({'name': item[0], 'data': [int(item[1])]})";
	    widget.transfer(command, 2);
	});
	
	var action_title = document.createElement('div');
	action_title.innerHTML = "<h3>select a visualization</h3>";

	var action_sel = document.createElement('select');
	action_sel.innerHTML = "<option>- please select -</option><option>piechart</option><option>barchart</option>";
	action_sel.addEventListener('change', function(event) {
	    var command = "# selecting visualization\n";
	    if (this.options[this.selectedIndex].value == 'piechart') {
		command += "type = 'pie'";
	    } else {
		command += "type = 'stackedRow'";
	    }
	    widget.transfer(command, 3);
	});

	var doit = document.createElement('input');
	doit.setAttribute('class', 'btn');
	doit.setAttribute('type', 'button');
	doit.setAttribute('value', 'show result');
	doit.addEventListener('click', function(event){
	    var command = "# initializing renderer\nretinalib = retina.Retina()\nxlabels = [ ' ' ]\n\n# calling the visualization function\nretinalib.barchart(btype=type, data=json.dumps(graph_data), title=title, x_labels=json.dumps(xlabels))";
	    widget.transfer(command, 4);
	    stm.send_message('myframe', "IPython.notebook.execute_all_cells();", 'action');
	});

	leftside.appendChild(info_title);
	leftside.appendChild(info_sel);
	leftside.appendChild(action_title);
	leftside.appendChild(action_sel);
	leftside.appendChild(document.createElement('br'));
	leftside.appendChild(doit);

	// right side
	var iframe = document.createElement('iframe');
	iframe.setAttribute('src', "http://140.221.84.122:8888/3698432d-4d82-4e12-a654-35d9f3fc8dc5");
	iframe.setAttribute('width', '100%');
	iframe.setAttribute('height', '750px;');
	iframe.setAttribute('id', 'myframe');
	iframe.innerHTML = "Your Browser does not support iFrames";

	rightside.appendChild(iframe);
    };
    
    widget.transfer = function (data, n) {
	var command = data.replace(/'/g, '"').replace(/"/g, "!!").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
	var msgstring = 'ipy.write_cell('+n+', \''+command+'\');';
	stm.send_message('myframe', msgstring, 'action');
    };
    
    widget.loadSelector = function () {
	var metagenome_data = [];
	for (i in stm.DataStore["metagenome"]) {
	    if (stm.DataStore["metagenome"].hasOwnProperty(i)) {
		if (stm.DataStore["metagenome"][i]["metadata"]  ==  null ) {
		    continue;
		}
		if (stm.DataStore["metagenome"][i]["metadata"]["sample"]  ==  null ) {
		    continue;
		}
		if (stm.DataStore["metagenome"][i]["metadata"]["project"]  ==  null ) {
		    continue;
		}
		metagenome_data.push( { "name": stm.DataStore["metagenome"][i]["name"],
					"id": i,
					"biome": stm.DataStore["metagenome"][i]["metadata"]["sample"]["data"]["biome"],
					"project": stm.DataStore["metagenome"][i]["metadata"]["project"]["name"],
					"pi": stm.DataStore["metagenome"][i]["metadata"]["project"]["data"]["PI_firstname"] + ' ' + stm.DataStore["metagenome"][i]["metadata"]["project"]["data"]["PI_lastname"] });
	    }
	}

	Retina.RendererInstances.listselect[1].settings.data = metagenome_data;
	Retina.RendererInstances.listselect[1].render();
    };
    
})();