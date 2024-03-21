import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js'
import { GUI } from 'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js'

/*import Stats from 'https://unpkg.com/three@0.160.0/examples/jsm/libs/stats.module.js';*/

//let stats;
let camera, scene, raycaster, renderer;

let intersects;
var curr_intersect = 'none';

const searchParams = new URLSearchParams(window.location.search);
console.log(searchParams.get('type'));
var default_respType = 'suppression index';
var map_type = '';
switch (searchParams.get('type')) {
	case 'ci':
		default_respType = 'consistency index';
		map_type = 'ci';
		break;
	case 'nmf':
		default_respType = 'NMF';
		map_type = 'nmf';
		break;
	case 'si':
		default_respType = 'suppression index';
		map_type = 'si';
}

const pointer = new THREE.Vector2();
console.log(THREE.REVISION);
const lowerleftdiv = document.getElementById('lowerleft');
//const erp_img_div = document.getElementById('erp_img');
const erp_img_div = document.getElementById('lowerright');

let pickableObjects = [];
let brainObjects = [];
let intersectedObject;

const lh_loader = new OBJLoader();
const rh_loader = new OBJLoader();

const params = {
	subj: 'atlas',
	respType: default_respType,
	roi: 'all',
	lh_color: '#efefef',
	rh_color: '#efefef',
	theme: 'medium',
	device_lines_checkbox: true,
	lh_checkbox: true,
	rh_checkbox: true,
}
const subjs = [
	'atlas', 'S0004', 'S0006', 'S0007', 
	'S0014', 'S0015', 'S0017', 'S0018',
  'S0019', 'S0020', 'S0021', 'S0023', 
  'S0024', 'S0026', 'TCH06', 'TCH14']
const themes = [
	'dark', 'medium', 'light',
] 
const theme_params = {
	'light':  {'transmission': 0.32,
               'opacity': 0.6,
               'brainColor': '#ebe9e5',
          	   'lineColor': '#000',
          	   'bgColor': new THREE.Color( 0xefefef ),
          	   'lowerleftbg': '#d3d3d3',
          	   'listtxtColor': '#000',
          	   'elecbgColor': '#e3e3e3',
          	   'elecinfoColor': '#000',
          	   'bgColorHTML': '#efefef',
    },
	'medium': {'transmission': 0.8,
			   		 'opacity': 0.7,
			   		 'brainColor': '#efefef',
			   		 'lineColor': '#fff',
			   		 'bgColor': new THREE.Color( 0x333333),
			   		 'lowerleftbg': '#262626',
			   		 'listtxtColor': '#fff',
			   		 'elecbgColor': '#505050',
			   		 'elecinfoColor': '#fff',
			   		 'bgColorHTML': '#333333',
	},
	'dark':   {'transmission': 1.0,
			   		 'opacity': 0.7,
			   		 'brainColor': '#efefef',
			   		 'lineColor': '#fff',
			   		 'bgColor': new THREE.Color( 0x222222),
			   		 'lowerleftbg': '#262626',
			   		 'listtxtColor': '#fff',
			   		 'elecbgColor': '#505050',
			   		 'elecinfoColor': '#fff',
			   		 'bgColorHTML': '#222222',
	}
}

const respTypes = [
	'NMF',
	'suppression index',
	'consistency index',
]
const rois = [
	'all',
	'HG',
	'PT',
	'PP',
	'STG',
	'STS',
	'MTG',
	'insula',
	'occ'
]

// Materials
const originalMaterials = {}
const highlightedMaterial = new THREE.MeshBasicMaterial({
  wireframe: true,
  //color: 0xffffff
})
const highlightedBrainMaterial = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x0000ff
})

// see https://threejs.org/examples/?q=trans#webgl_materials_physical_transmission_alpha

//const line_material = new THREE.LineBasicMaterial( { color: 0xffffff } );

//const elec_material = new THREE.MeshLambertMaterial( { color: 	0x000000} )
const elec_material = new THREE.MeshLambertMaterial( { vertexColors: 	true} )
//const elec_material = new THREE.MeshLambertMaterial( { color: 	elec_color} )

const left_material = new THREE.MeshPhysicalMaterial({});
left_material.reflectivity = 0;//.5;
left_material.transmission = theme_params[params.theme].transmission;
left_material.opacity = theme_params[params.theme].opacity;
left_material.transparent = true;
left_material.roughness = 0;
left_material.metalness = 0.3;
left_material.color.set(params.lh_color);// = new THREE.Color(0xefefef); //new THREE.Color(0xffb6c1); //light pink
left_material.ior = 1.5;
left_material.thickness = 0; //2.27; // Makes this look like thick glass
left_material.attenuationColor= new THREE.Color(0xffffff);
left_material.attenuationDistance = .15;
left_material.specularIntensity = 1;
left_material.specularColor = new THREE.Color(0xffffff);
left_material.envMapIntensity = 1;
left_material.lightIntensity = 0.2;
left_material.flatShading = false;
left_material.smooth = true;
left_material.side = THREE.DoubleSide;

const right_material = left_material.clone()

// For electrodes
var electrode_group = new THREE.Group();
var device_group_lh = new THREE.Group();
var device_group_rh = new THREE.Group();
var pivot_lh = new THREE.Group();
var pivot_rh = new THREE.Group();
var lh_group = new THREE.Group();

// Load the CSV file using fetch
let results;
var elec_loader = new THREE.FileLoader();
var elec_array;

init();
animate();


function init() {

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 20 );
	camera.position.z = -2.5;

	scene = new THREE.Scene();
	scene.background = theme_params[params.theme].bgColor; //new THREE.Color( 0x222222 );

	const light = new THREE.DirectionalLight( 0xffffff , 3);
	light.position.set( 0, 0, 0 ).normalize();
	camera.add( light );
	scene.add(camera)

	//Could turn this back on to show the xyz axes
	//var axesHelper = new THREE.AxesHelper( 5 );
	//scene.add( axesHelper );

	// Add the GUI for making changes to the scene and the displayed data
	const gui = new GUI()
	const subjFolder = gui.addFolder('Subject')
	subjFolder.add(params, 'subj', subjs)
		.name('Participant ID: ')
		.onChange( function ( value )  {
			if (value != 'atlas') {
				gui.updateDisplay();
			}
		updateElecs();
	});
	subjFolder.add(params, 'respType', respTypes)
		.name('Response type: ')
		.onChange( function ( value ) {
			//if (value != 'all') {
				//params.subj = 'atlas';
				var map_type = '';
				switch (params.respType) {
					case 'consistency index':
						map_type = 'ci';
						break;
					case 'NMF':
						map_type = 'nmf';
						break;
					case 'suppression index':
						map_type = 'si';
				}
				var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?type=' + map_type;
				// Change the URL without reloading
				var stateObject = {};
				history.pushState(stateObject, '', newUrl);

				// Change the URL and reload the page
				//window.location.href = newUrl;
				gui.updateDisplay();
			//}
		updateElecs();
	})
	subjFolder.add(params, 'roi', rois)
		.name('Anatomy: ')
		.onChange( function ( value ) {
			updateElecs();
		})
	subjFolder.add(params, 'device_lines_checkbox')
		.name('Device lines: ')
		.onChange(function (value) {
	  		updateElecs();
		}); 
	subjFolder.open()

	const brainlhFolder = gui.addFolder('Left Hemisphere')
	brainlhFolder.add(left_material, 'transmission', 0, 1.0)
		.onChange(function() {
			render()
		})
	brainlhFolder.add(left_material, 'opacity', 0, 1.0)
		.onChange(function() {
			render()
		})
	brainlhFolder.addColor(params, 'lh_color')
			.name('color')
			.onChange(function() {
			left_material.color.set(params.lh_color);
			left_material.needsUpdate = true;
			});
		brainlhFolder.add(params, 'lh_checkbox')
		.name('Show left: ')
		.onChange(function (value) {
			updateElecs();
		});
	//brainlhFolder.open()

	const brainrhFolder = gui.addFolder('Right Hemisphere')
	brainrhFolder.add(right_material, 'transmission', 0, 1.0)
		.onChange(function() {
			render()
		})
	brainrhFolder.add(right_material, 'opacity', 0, 1.0)
		.onChange(function() {
			render()
		})
	brainrhFolder.addColor(params, 'rh_color')
			.name('color')
			.onChange(function() {
			right_material.color.set(params.rh_color);
			right_material.needsUpdate = true;
			});
		brainrhFolder.add(params, 'rh_checkbox')
		.name('Show right: ')
		.onChange(function (value) {
			updateElecs();
		});
	//brainrhFolder.open()

	//const pivotFolder = gui.addFolder('Move')

	// Add a menu with different color themes, these presets look nice
	const themeFolder = gui.addFolder('Color Themes')
	themeFolder.add(params, 'theme', themes).onChange( function ( value )  {
		left_material.transmission = theme_params[value].transmission;
		left_material.opacity = theme_params[value].opacity;
		right_material.transmission = theme_params[value].transmission;
		right_material.opacity = theme_params[value].opacity;
		//line_material.color = theme_params[value].lineColor;
		params.rh_color = theme_params[value].brainColor;
		params.lh_color = theme_params[value].brainColor;
		scene.background = theme_params[value].bgColor;
		
		document.getElementById('lowerleft').style.backgroundColor = theme_params[value].lowerleftbg;
		document.documentElement.style.setProperty('--list-text', theme_params[value].listtxtColor);
		document.documentElement.style.setProperty('--elec-bg', theme_params[value].elecbgColor);
		document.documentElement.style.setProperty('--elecinfo-col', theme_params[value].elecinfoColor);
		document.body.style.backgroundColor = theme_params[value].bgColorHTML;
		gui.updateDisplay();
		updateElecs();
		render();
	});
	themeFolder.open();
	
	loadAsset( params );

	// Check for where the user is pointing using raycaster,
	// look for intersecting electrodes
	raycaster = new THREE.Raycaster();

	renderer = new THREE.WebGLRenderer( { antialias: false, alpha: false } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1;
	renderer.physicallyCorrectLights = true;
	document.body.appendChild( renderer.domElement );

	//stats = new Stats();
	//document.body.appendChild( stats.dom );

	//document.addEventListener( 'mousemove', onPointerMove );
	document.addEventListener( 'mousedown', onPointerMove );

	window.addEventListener( 'resize', onWindowResize );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 0;
	controls.maxDistance = 50;
	//controls.enableDamping = true;
	controls.addEventListener( 'change', render );

	//gui.add(controls, 'rotation', -5, 5).onChange(function(value){
	//	rotationAngle = value * Math.PI / 180;
	//});
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function onPointerMove( event ) {
	
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	raycaster.setFromCamera(pointer, camera)

	intersects = raycaster.intersectObjects(pickableObjects, false)
	
	if (intersects.length > 0) {
		// console.log(curr_intersect, intersects[0].object.name)
		// if (intersects[0].object.name != curr_intersect) {
		// 	StopSound('mySound');
		// 	PlaySound('mySound');
	    // }
	    // else {
		// 	PlaySound('mySound');
	    // }
	    curr_intersect = intersects[0].object.name;
	    //console.log(curr_intersect, intersects[0].object.name);

		intersectedObject = intersects[0].object;
		//var value_norm_spkr = Math.round(intersectedObject.value_norm_spkr*100)/100;
		//var value_norm_mic = Math.round(intersectedObject.value_norm_mic*100)/100;
		//var gabor_corr = Math.round(intersectedObject.gabor_corr*100)/100;
		//console.log(value_norm_spkr)
		//var red = Math.round(value_norm_spkr*100)/100;
		//var green = 0;
		//var blue = Math.round(value_norm_mic*100)/100;				  

		//document.documentElement.style.setProperty('--scale-factor', red);
		//document.documentElement.style.setProperty('--scale-factor-spec', blue);
		//document.documentElement.style.setProperty('--scale-factor-gab', green);

		document.getElementById('parttxt').textContent = intersectedObject.subj;
		document.getElementById('chtxt').textContent = intersectedObject.ch;
		document.getElementById('anattxt').textContent = intersectedObject.anatomy;
		//document.getElementById('phntxt').textContent = `listening = ${value_norm_spkr}`;
		//document.getElementById('spectxt').textContent = `speaking = ${value_norm_mic}`;

		//erp_img_div.innerHTML = '';
		//var imgElement = document.createElement('img');
		var img_name = `./png/${map_type}/${intersectedObject.subj}_${intersectedObject.ch}_${map_type}.png`;
		console.log(img_name);
		document.getElementById('erp_img').src = img_name;
		document.getElementById('erp_img').onload = function() {
    // Now the image is loaded, you can safely set its dimensions
    this.style.width = "300px";
    this.style.height = "250px";
		};
		//erp_img_div.appendChild(imgElement);
		//var phn_item = document.getElementById('phn');
		//phn_item.classList.add('animate-scale');
	} else {
		intersectedObject = null
	}
	pickableObjects.forEach((o, i) => {
		if (intersectedObject && intersectedObject.name === o.name) {
			pickableObjects[i].material = highlightedMaterial;
		} 
		else {
			pickableObjects[i].material = originalMaterials[o.name];
		}
	})
	requestAnimationFrame( animate );
	camera.updateProjectionMatrix();

} 

function loadAsset( params ) {
	var smooth = ''
	var csv_file = ''
	if (params.subj == 'atlas') {
		smooth = '_03_03_03'
	}
	else {
		smooth = '_03'
	}
	var mesh = {'lh': 'meshes/' + params.subj + '/lh_pial_smooth' + smooth + '.obj',
	            'rh': 'meshes/' + params.subj + '/rh_pial_smooth' + smooth + '.obj'};

	switch (params.respType) {
		case 'consistency index':
			map_type = 'ci';
			break;
		case 'NMF':
			map_type = 'nmf';
			break;
		case 'suppression index':
			map_type = 'si';
	}
	csv_file = `./elecs/op/elecs_${map_type}_cmap.csv`;

	let recenter_x;
	//pivot_lh = new THREE.Group();
	//pivot_rh = new THREE.Group();
	console.log(mesh)
	// load left hemisphere
	lh_loader.load(
		// resource URL
		mesh.lh,
		// called when resource is loaded
		function ( object ) {
			object.scale.setScalar(0.01); // convert to meters
			object.rotation.x = 3.14/2;
			object.rotation.z = -3.14/2;//Math.pi;
			object.rotation.y = 3.14;
			object.name = 'brain_lh'	
			object.traverse( function( child ) {
	            if ( child instanceof THREE.Mesh ) {
	                child.material = left_material;
	                //child.geometry.computeBoundingBox();
					//object.bBox = child.geometry.boundingBox;
	                };
	        	} 
	        );

			object.visible = params.lh_checkbox;
			//pivot_lh.add( object );
			scene.add( object );
		},
		// called when loading is in progresses
		function ( xhr ) {
			console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
		},
		// called when loading has errors
		function ( error ) {
			console.log(error);
		}
	);
	// load right hemisphere
	rh_loader.load(
		// resource URL
		mesh.rh,
		// called when resource is loaded
		function ( object ) {
			object.scale.setScalar(0.01); // convert to meters
			object.rotation.x = 3.14/2;
			object.rotation.z = -3.14/2;//Math.pi;
			object.rotation.y = 3.14;
			object.name = 'brain_rh'	
			object.traverse( function( child ) {
	            if ( child instanceof THREE.Mesh ) {
	                child.material = right_material;
	                };
	        	} 
	        	);
			object.visible = params.rh_checkbox;
			//pivot_rh.add( object );
			scene.add( object );
		},
		// called when loading is in progresses
		function ( xhr ) {
			console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
		},
		// called when loading has errors
		function ( error ) {
			console.log( error );
		}
	);
	elec_loader.load( csv_file, function( text ) {
			//console.log( text );
			const line_material = new THREE.LineBasicMaterial( { color: theme_params[params.theme].lineColor } )
			const geometry = new THREE.SphereGeometry( 0.02, 8, 8 ); //new THREE.BoxGeometry();
			//electrode_group = new THREE.Group();
			pivot_lh = new THREE.Group();
			pivot_rh = new THREE.Group();
			//device_group_lh = new THREE.Group();
			//device_group_rh = new THREE.Group();

	 		results = Papa.parse(text, { header: true, dynamicTyping: true })
	 		//console.log(results.data);
	 		elec_array = results.data;
	 		//console.log(elec_array[0].x, elec_array.length);

	 		var last_elec_device = {name: 'temporary',
	 								ch: 'temp1',
	 								x:0, y:0, z:0}; 
	 		var curr_elec_device = {name: 'new', ch: 'temp2', x:0, y:0, z:0};
	 		for ( let i = 0; i < elec_array.length; i ++ ) {
	 			const elecGeom = geometry.clone();
	 			if ((elec_array[i].subj_id == params.subj) || (params.subj == 'atlas')) {

	 						
	 					var rgb = [elec_array[i].r, elec_array[i].g, elec_array[i].b];
	 					var scale = 1.0;

						if (elec_array[i].include_elec == False) {
							scale = 0.3;
							rgb = [0, 0, 0];
						}

	 					const colors = [];
						for ( let i = 0, n = geometry.attributes.position.count; i < n; ++ i ) {
							colors.push( rgb[0], rgb[1], rgb[2] );
						}
						elecGeom.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
				    elecGeom.attributes.color.needsUpdate = true;

						const object = new THREE.Mesh( elecGeom, elec_material )	;
						//opacity: ((rgb[0]+rgb[1]+rgb[2])/3)/0.5+0.5, transparent: true 
						curr_elec_device.name = elec_array[i].device;
						curr_elec_device.ch = elec_array[i].ch_name;

						if (params.subj != 'atlas') {
							object.position.x = -elec_array[i].y*0.01;
							object.position.y =  elec_array[i].z*0.01;
							object.position.z = -elec_array[i].x*0.01;
							
						}
						else {
							object.position.x = -elec_array[i].y_warp*0.01;
							object.position.y =  elec_array[i].z_warp*0.01;
							object.position.z = -elec_array[i].x_warp*0.01;

						}
						object.scale.setScalar(scale);

						curr_elec_device.x  = object.position.x;
						curr_elec_device.y  = object.position.y;
						curr_elec_device.z  = object.position.z;

						// Create a line along the device to show which 
						// electrodes belong to the same device (e.g. RSTG1-RSTG2-RSTG3)
						if (curr_elec_device.name == last_elec_device.name) {
							//if (object.electype == 'depth') {
							if (curr_elec_device.name != 'LG') { // this one is a grid
								console.log('making a line')
								console.log(curr_elec_device.name, last_elec_device.name)
								//console.log(elec_array[i].ch)
								const points = [];
								points.push( new THREE.Vector3( curr_elec_device.x, curr_elec_device.y, curr_elec_device.z ) );
								//points.push( new THREE.Vector3(0,0,0));
								points.push( new THREE.Vector3( last_elec_device.x, last_elec_device.y, last_elec_device.z ) );

								const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
								const line = new THREE.Line( lineGeometry, line_material );

								if (object.position.z > 0) {
									//device_group_lh.add(line);
									line.visible = params.lh_checkbox && params.device_lines_checkbox;
									pivot_lh.add(line);
								}
								else {
									//device_group_rh.add(line);
									line.visible = params.rh_checkbox && params.device_lines_checkbox;
									pivot_rh.add(line);
								}
							}

						}

						last_elec_device.name = elec_array[i].device;
						last_elec_device.ch = elec_array[i].ch_name;

						if (params.subj != 'atlas') {
							last_elec_device.x = -elec_array[i].y*0.01;
							last_elec_device.y = elec_array[i].z*0.01;
							last_elec_device.z = -elec_array[i].x*0.01;
						}
						else {
							last_elec_device.x = -elec_array[i].y_warp*0.01;
							last_elec_device.y = elec_array[i].z_warp*0.01;
							last_elec_device.z = -elec_array[i].x_warp*0.01;
						}
						
						//console.log('will try to recenter electrode by:')
						//console.log(recenter_x)
						//object.position.x -= (recenter_x/2)/ window.innerWidth;

						object.name = `electrode${i}`;
						object.anatomy = elec_array[i].anat;
						object.ch = elec_array[i].ch_name;
						object.subj = elec_array[i].subj_id;
						object.value_norm_spkr = elec_array[i].value_norm_spkr;
						object.value_norm_mic = elec_array[i].value_norm_mic;
						object.red = elec_array[i].value_norm_spkr; //rgb[0];
						object.green = 0; //rgb[1];
						object.blue = elec_array[i].value_norm_mic; //rgb[2];
						console.log(elec_array[i].value_norm_spkr, elec_array[i].value_norm_mic)
						
						//scene.add(object);
						//electrode_group.add(object);
						if (object.position.z > 0) {
							console.log('adding to pivot_lh object')
							object.visible = params.lh_checkbox;
							
							pivot_lh.add(object);
						}
						else{
							object.visible = params.rh_checkbox;
							pivot_rh.add(object);
						}
						pickableObjects.push(object);

						originalMaterials[object.name] = object.material;
				
			};
		};
		scene.add(pivot_lh);
		scene.add(pivot_rh);
		
	} );
}

function updateElecs() {
	scene.remove( pivot_rh );
	scene.remove( pivot_lh );
	//scene.remove(electrode_group);
	scene.remove(device_group_lh);
	scene.remove(device_group_rh);

	var selectedObject = scene.getObjectByName('brain_lh');
	scene.remove( selectedObject );

	var selectedObject = scene.getObjectByName('brain_rh');
	scene.remove( selectedObject );
	
	//var electrodeObjects = scene.getObjectByName
	pickableObjects = [];
	brainObjects = [];

	loadAsset( params );

}

//

function animate() {
	//pivot_lh.center
	//pivot_lh.add(device_group_lh)
	//pivot_lh.add(scene.getObjectByName('brain_lh'))
	//pivot_lh.rotation.set(0, -Math.PI / 2, 0);

	//pivot_rh.add(scene.getObjectByName('brain_rh'))
	//pivot_rh.rotation.set(0, Math.PI / 2, 0);
	
	//requestAnimationFrame( animate );
	
	render();
	//stats.update();

}

function render() {
	//pivot_lh.rotateY(controls.rotation);
	renderer.render( scene, camera );
}

// function hidePanel(value) {

// }
// document.addEventListener('DOMContentLoaded', function() {
//     // Get the link and the div
//     var hideLink = document.getElementById('hidelink');
//     var divToHide = document.getElementById('infoleft');

//     // Add click event listener to the link
//     hideLink.addEventListener('click', function(event) {
//         // Prevent the default link behavior
//         event.preventDefault();

//         // Hide the div
//         divToHide.classList.add('hidden');
//     });
// });

document.addEventListener('DOMContentLoaded', function() {
    var link = document.getElementById('hidelink');
		var panel = document.getElementById('infoleft');

    link.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent default link behavior
        hidePanel();
    });

    function hidePanel() {
        
        if (panel.classList.contains('hidden')) {
            // Show the panel and change link text to "Hide"
        		console.log('showing')
            panel.classList.remove('hidden');
            link.textContent = '((Hide this panel))';
        } else {
        	console.log('hiding')
            // Hide the panel and change link text to "Show"
            panel.classList.add('hidden');
            link.textContent = '((Show info))';
        }
    }
    var collapseButton = document.querySelector('.collapse-button');
    var content = document.querySelector('.collapsible-content');

    collapseButton.addEventListener('click', function() {
    	console.log(content.style.display)
        if (content.style.display === "none" || content.style.display === '') {
            content.style.display = "block";
            collapseButton.innerHTML = "<h2 id='elecinfotxt'>▼ Electrode Info:</h2>";
        } else {
            content.style.display = "none";
            collapseButton.innerHTML = "<h2 id='elecinfotxt'>► Electrode Info:</h2>";
        }
    });
});
