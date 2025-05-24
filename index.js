import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup with clean white background
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Pure white background

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(50, 50, 50);

// Renderer setup with enhanced quality
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Add OrbitControls for 3D navigation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 15;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI;

// Raycaster for mouse picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Network data storage
let nodes = [];
let edges = [];
let nodeObjects = [];
let edgeObjects = [];

// Hover state
let hoveredNode = null;

// Microsoft Fluent Design color palette
const groupColors = [
    0x0078d4, // Microsoft Blue (primary)
    0x107c10, // Microsoft Green
    0xff4b4b, // Microsoft Red
    0xffb900, // Microsoft Yellow/Orange
    0x5c2d91, // Microsoft Purple
    0x00bcf2, // Microsoft Light Blue
    0x498205, // Microsoft Dark Green
    0xd13438, // Microsoft Dark Red
    0xca5010, // Microsoft Orange
    0x8764b8, // Microsoft Light Purple
    0x038387, // Microsoft Teal
    0x8e562e, // Microsoft Brown
    0x567c73, // Microsoft Sage
    0x486991, // Microsoft Steel Blue
    0x744da9  // Microsoft Violet
];

// Create Microsoft-style tooltip element
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.padding = '12px 16px';
tooltip.style.background = '#ffffff';
tooltip.style.color = '#323130';
tooltip.style.borderRadius = '4px';
tooltip.style.fontFamily = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif';
tooltip.style.fontSize = '14px';
tooltip.style.fontWeight = '400';
tooltip.style.pointerEvents = 'none';
tooltip.style.display = 'none';
tooltip.style.zIndex = '1000';
tooltip.style.border = '1px solid #e1dfdd';
tooltip.style.boxShadow = '0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108)';
document.body.appendChild(tooltip);

// Load and process the network data
async function loadNetworkData() {
    try {
        const response = await fetch('miserables.json');
        const data = await response.json();
        
        nodes = data.nodes;
        edges = data.links;
        
        // Initialize node positions randomly in 3D space
        nodes.forEach((node, i) => {
            node.id = i;
            node.x = (Math.random() - 0.5) * 40;
            node.y = (Math.random() - 0.5) * 40;
            node.z = (Math.random() - 0.5) * 40;
            node.vx = 0;
            node.vy = 0;
            node.vz = 0;
        });
        
        // Apply force-directed layout
        applyForceLayout();
        
        // Create 3D objects
        createNetworkVisualization();
        
    } catch (error) {
        console.error('Error loading network data:', error);
    }
}

// Simple force-directed layout algorithm
function applyForceLayout() {
    const iterations = 300;
    const repulsionStrength = 1000;
    const attractionStrength = 0.1;
    const damping = 0.9;
    
    for (let iter = 0; iter < iterations; iter++) {
        // Reset forces
        nodes.forEach(node => {
            node.fx = 0;
            node.fy = 0;
            node.fz = 0;
        });
        
        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dz = nodes[i].z - nodes[j].z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.1;
                
                const force = repulsionStrength / (distance * distance);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                const fz = (dz / distance) * force;
                
                nodes[i].fx += fx;
                nodes[i].fy += fy;
                nodes[i].fz += fz;
                nodes[j].fx -= fx;
                nodes[j].fy -= fy;
                nodes[j].fz -= fz;
            }
        }
        
        // Attraction along edges
        edges.forEach(edge => {
            const source = nodes[edge.source];
            const target = nodes[edge.target];
            
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dz = target.z - source.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            const force = attractionStrength * distance;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            const fz = (dz / distance) * force;
            
            source.fx += fx;
            source.fy += fy;
            source.fz += fz;
            target.fx -= fx;
            target.fy -= fy;
            target.fz -= fz;
        });
        
        // Update positions
        nodes.forEach(node => {
            node.vx = (node.vx + node.fx) * damping;
            node.vy = (node.vy + node.fy) * damping;
            node.vz = (node.vz + node.fz) * damping;
            
            node.x += node.vx;
            node.y += node.vy;
            node.z += node.vz;
        });
    }
}

// Create the 3D network visualization
function createNetworkVisualization() {
    // Create edges with Microsoft-style subtle lines
    edges.forEach(edge => {
        const source = nodes[edge.source];
        const target = nodes[edge.target];
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            source.x, source.y, source.z,
            target.x, target.y, target.z
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({ 
            color: 0xc8c6c4, // Microsoft neutral gray
            transparent: true,
            opacity: 0.5
        });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        edgeObjects.push(line);
    });
    
    // Create nodes with Microsoft Fluent Design materials
    nodes.forEach(node => {
        const geometry = new THREE.SphereGeometry(1.2, 32, 32);
        const color = groupColors[node.group % groupColors.length];
        
        const material = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: false,
            opacity: 1.0
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(node.x, node.y, node.z);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        sphere.userData = { 
            name: node.name, 
            group: node.group,
            originalColor: color,
            originalScale: 1
        };
        
        scene.add(sphere);
        nodeObjects.push(sphere);
    });
    
    // Clean, bright lighting for white background
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(50, 50, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 500;
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-50, -50, -50);
    scene.add(directionalLight2);
}

// Handle mouse hover for tooltips
function onMouseMove(event) {
    // Update mouse coordinates for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast to detect hover
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeObjects);
    
    // Reset previous hover state
    if (hoveredNode) {
        hoveredNode.material.color.setHex(hoveredNode.userData.originalColor);
        hoveredNode.scale.setScalar(hoveredNode.userData.originalScale);
        hoveredNode = null;
        tooltip.style.display = 'none';
    }
    
    // Handle new hover
    if (intersects.length > 0) {
        const intersectedNode = intersects[0].object;
        hoveredNode = intersectedNode;
        
        // Highlight with Microsoft-style hover effect
        const lighterColor = new THREE.Color(intersectedNode.userData.originalColor).lerp(new THREE.Color(0xffffff), 0.3);
        intersectedNode.material.color.setHex(lighterColor.getHex());
        intersectedNode.scale.setScalar(1.3);
        
        // Show Microsoft-style tooltip
        tooltip.innerHTML = `
            <div style="font-weight: 600; color: #323130; margin-bottom: 4px;">${intersectedNode.userData.name}</div>
            <div style="color: #605e5c; font-size: 12px;">Group ${intersectedNode.userData.group}</div>
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = event.clientX + 15 + 'px';
        tooltip.style.top = event.clientY - 10 + 'px';
        
        // Change cursor to pointer
        document.body.style.cursor = 'pointer';
    } else {
        // Reset cursor
        document.body.style.cursor = 'default';
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    renderer.render(scene, camera);
}

// Event listeners
document.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('resize', onWindowResize, false);

// Add Microsoft-style info panel
const info = document.createElement('div');
info.style.position = 'absolute';
info.style.top = '20px';
info.style.left = '20px';
info.style.background = '#ffffff';
info.style.color = '#323130';
info.style.fontFamily = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif';
info.style.fontSize = '14px';
info.style.padding = '20px';
info.style.borderRadius = '4px';
info.style.border = '1px solid #e1dfdd';
info.style.boxShadow = '0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108)';
info.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: #0078d4; font-weight: 600; font-size: 18px;">Character Network Analysis</h3>
    <div style="margin-bottom: 8px; color: #323130;"><strong>Dataset:</strong> Les Misérables</div>
    <div style="margin-bottom: 8px; color: #323130;"><strong>Characters:</strong> ${nodes.length}</div>
    <div style="margin-bottom: 16px; color: #323130;"><strong>Relationships:</strong> ${edges.length}</div>
    <div style="font-size: 12px; color: #605e5c; line-height: 1.4;">
        <div style="margin-bottom: 4px;">🖱️ Left drag: Rotate view</div>
        <div style="margin-bottom: 4px;">🖱️ Right drag: Pan</div>
        <div style="margin-bottom: 4px;">🖱️ Scroll: Zoom</div>
        <div>🖱️ Hover: Character details</div>
    </div>
`;
document.body.appendChild(info);

// Start the application
loadNetworkData().then(() => {
    animate();
});