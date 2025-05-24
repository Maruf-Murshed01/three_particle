import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Raycaster for mouse picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Controls for mouse interaction
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
let rotationX = 0, rotationY = 0;

// Network data storage
let nodes = [];
let edges = [];
let nodeObjects = [];
let edgeObjects = [];

// Hover state
let hoveredNode = null;

// Color palette for different groups (similar to Viridis colorscale)
const groupColors = [
    0x440154, 0x482777, 0x3f4a8a, 0x31678e, 0x26838f,
    0x1f9d8a, 0x6cce5a, 0xb6de2b, 0xfee825, 0xfde725
];

// Create tooltip element
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.padding = '8px 12px';
tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
tooltip.style.color = 'white';
tooltip.style.borderRadius = '4px';
tooltip.style.fontFamily = 'Arial, sans-serif';
tooltip.style.fontSize = '12px';
tooltip.style.pointerEvents = 'none';
tooltip.style.display = 'none';
tooltip.style.zIndex = '1000';
tooltip.style.border = '1px solid #555';
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
    // Create edges (lines)
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
            color: 0x555555,
            transparent: true,
            opacity: 0.6
        });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        edgeObjects.push(line);
    });
    
    // Create nodes (spheres)
    nodes.forEach(node => {
        const geometry = new THREE.SphereGeometry(0.8, 16, 16);
        const color = groupColors[node.group % groupColors.length];
        const material = new THREE.MeshBasicMaterial({ color: color });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(node.x, node.y, node.z);
        sphere.userData = { 
            name: node.name, 
            group: node.group,
            originalColor: color,
            originalScale: 1
        };
        
        scene.add(sphere);
        nodeObjects.push(sphere);
    });
    
    // Add some ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
}

// Handle mouse hover for tooltips
function onMouseMove(event) {
    // Update rotation controls
    mouseX = (event.clientX - window.innerWidth / 2);
    mouseY = (event.clientY - window.innerHeight / 2);
    
    targetRotationX = (mouseY * 0.002);
    targetRotationY = (mouseX * 0.002);
    
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
        
        // Highlight the hovered node
        intersectedNode.material.color.setHex(0xffffff);
        intersectedNode.scale.setScalar(1.5);
        
        // Show tooltip
        tooltip.innerHTML = `
            <strong>${intersectedNode.userData.name}</strong><br>
            Group: ${intersectedNode.userData.group}
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = event.clientX + 10 + 'px';
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
    
    // Smooth rotation based on mouse movement
    rotationX += (targetRotationX - rotationX) * 0.05;
    rotationY += (targetRotationY - rotationY) * 0.05;
    
    // Rotate the entire scene
    scene.rotation.x = rotationX;
    scene.rotation.y = rotationY;
    
    renderer.render(scene, camera);
}

// Event listeners
document.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('resize', onWindowResize, false);

// Add some info text
const info = document.createElement('div');
info.style.position = 'absolute';
info.style.top = '10px';
info.style.left = '10px';
info.style.color = 'white';
info.style.fontFamily = 'Arial, sans-serif';
info.style.fontSize = '14px';
info.innerHTML = `
    <h3>Les Misérables Character Network</h3>
    <p>Move mouse to rotate • Hover over nodes to see character names</p>
    <p>${nodes.length} characters • ${edges.length} connections</p>
    <p>Colors represent different character groups</p>
`;
document.body.appendChild(info);

// Start the application
loadNetworkData().then(() => {
    animate();
});