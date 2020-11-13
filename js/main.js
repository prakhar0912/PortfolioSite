let game, scene, followCam, physics, damping, wheelMaterial, vehicle,
    lastTime, world, joystick, container, renderer,
    fixedTimeStep = 1.0 / 60.0, forwardMain = 0, turnMain = 0,
    clock, maxSteerVal = 0.5, maxForce = 500, brakeForce = 7, helper,
    reduceForward, incForward, groundMaterial

let init = () => {
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 2000)
    camera.position.set(10, 20, 15);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    helper = new CannonHelper(scene);
    helper.addLights(renderer);

    new THREE.OrbitControls(camera, renderer.domElement);


    window.addEventListener('resize', onWindowResize, false)

    if (window.innerWidth < 800) {
        joystick = new JoyStick({
            onMove: joystickCallback
        });
    }
    else {
        document.addEventListener('keydown', handler);
        document.addEventListener('keyup', handler)
    }

    initPhysics();
}

let initPhysics = () => {
    physics = {};
    world = new CANNON.World();

    world.broadphase = new CANNON.SAPBroadphase(world);
    world.gravity.set(0, -20, 0);

    world.defaultContactMaterial.friction = 0.3
    world.allowSleep = true


    groundMaterial = new CANNON.Material("groundMaterial");
    wheelMaterial = new CANNON.Material("wheelMaterial");
    const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
        friction: 0.3,
        restitution: 0.1,
        contactEquationStiffness: 1000
    });

    // We must add the contact materials to the this.world
    world.addContactMaterial(wheelGroundContactMaterial);

    let shape = new CANNON.Plane()
    let groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    groundBody.addShape(shape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);
    helper.addVisual(groundBody, 'landscape', true, true, new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors }));
    addCar()
    addEnvironment()
    animate()
}


let addEnvironment = () => {
    const boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
    boxMaterial = new CANNON.Material("boxMaterial");

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            boxBody = new CANNON.Body({
                mass: 1,
                material: boxMaterial,
                friction: 0.9
            })
            boxBody.addShape(boxShape)
            boxBody.allowSleep = true
            boxBody.sleepSpeedLimit = 0.2
            boxBody.position.set(5 + j, i + 1, 5)


            world.add(boxBody)
            helper.addVisual(boxBody, 'box')
        }


    }

    let wedgeBody = new CANNON.Body({
        mass: 1,
        friction: 1,
        material: boxMaterial
    })

    let wedge = [
        {
            "verts":
                [
                    -1, -1, -1,
                    1, -1, -1,
                    -1, -1, 1,
                    1, -1, 1,
                    1, 1, 1,
                    -1, 1, 1
                ],
            "faces":
                [
                    0, 1, 2,
                    1, 3, 2,
                    1, 4, 3,
                    2, 3, 5,
                    3, 4, 5,
                    0, 2, 5,
                    0, 5, 4,
                    1, 0, 4
                ],
            "offset": [0, 0, 0]
        }];

    let wedgeShape = new CANNON.ConvexPolyhedron(wedge.verts, wedge.faces);
    wedgeBody.addShape(wedgeShape)
    wedgeBody.position.set(5, 5, 5)
    world.add(wedgeBody)

    helper.addVisual(wedgeBody, 'ramp')

}



let addCar = () => {
    const chassisMaterial = new CANNON.Material("groundMaterial");
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 1, 2));
    const chassisBody = new CANNON.Body({ mass: 150, material: chassisMaterial });
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(0, 2, 0);
    helper.addVisual(chassisBody, 'car');


    const options = {
        radius: 0.5,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        suspensionStiffness: 30,
        suspensionRestLength: 0,
        frictionSlip: 5,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 100000,
        rollInfluence: 0.01,
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
        maxSuspensionTravel: 0.3,
        customSlidingRotationalSpeed: 0,
        useCustomSlidingRotationalSpeed: true
    };

    // Create the vehicle
    vehicle = new CANNON.RaycastVehicle({
        chassisBody: chassisBody,
        indexRightAxis: 0,
        indexUpAxis: 1,
        indeForwardAxis: 2
    });

    options.chassisConnectionPointLocal.set(1, -1.0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, -1.0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(1, -1.0, 1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, -1.0, 1);
    vehicle.addWheel(options);

    vehicle.addToWorld(world);
    const wheelBodies = [];
    vehicle.wheelInfos.forEach((wheel, i) => {
        const cylinderShape = new CANNON.Cylinder(wheel.radius + 0.1, wheel.radius, wheel.radius / 2, 20);
        const wheelBody = new CANNON.Body({ mass: 1, material: wheelMaterial });
        wheelBody.sleepSpeedLimit = 1
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
        wheelBodies.push(wheelBody);
        helper.addVisual(wheelBody, 'wheel' + i);
    });


    // Update wheels
    world.addEventListener('postStep', function () {
        let index = 0;
        vehicle.wheelInfos.forEach(function (wheel) {
            vehicle.updateWheelTransform(index);
            const t = wheel.worldTransform;
            wheelBodies[index].threemesh.position.copy(t.position);
            wheelBodies[index].threemesh.quaternion.copy(t.quaternion);
            index++;
        });
    });


    followCam = new THREE.Object3D();
    followCam.position.copy(camera.position);
    scene.add(followCam);
    followCam.parent = chassisBody.threemesh;
    helper.shadowTarget = chassisBody.threemesh;
}


let joystickCallback = (forward, turn) => {
    forwardMain = forward;
    turnMain = -turn;
}

let handler = (event) => {
    let up = (event.type == 'keyup');

    if (!up && event.type !== 'keydown') {
        return;
    }
    switch (event.keyCode) {

        case 38: // forward
            forwardMain = up ? 0 : 1
            break;

        case 40: // backward
            forwardMain = up ? 0 : -1
            break;

        case 39: // right
            turnMain = up ? 0 : -1
            break;

        case 37: // left
            turnMain = up ? 0 : 1
            break;
        case 84:
            vehicle.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 0), 0)
            vehicle.chassisBody.position.y = 3
            break;
    }
}

let onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

let updateDrive = (forward = forwardMain, turn = turnMain) => {

    let force = maxForce * forward;
    let steer = maxSteerVal * turn;

    if (forward != 0) {
        vehicle.setBrake(0, 0);
        vehicle.setBrake(0, 1);
        vehicle.setBrake(0, 2);
        vehicle.setBrake(0, 3);

        vehicle.applyEngineForce(force, 2);
        vehicle.applyEngineForce(force, 3);
        if (forward > 0) {
            vehicle.wheelInfos[0].rotation -= 1.1
            vehicle.wheelInfos[1].rotation -= 1.1

            vehicle.wheelInfos[2].rotation -= 1.1
            vehicle.wheelInfos[3].rotation -= 1.1
        }
        else {
            vehicle.wheelInfos[0].rotation += 1.1
            vehicle.wheelInfos[1].rotation += 1.1
            vehicle.wheelInfos[2].rotation += 1.1
            vehicle.wheelInfos[3].rotation += 1.1
        }
    } else {
        vehicle.setBrake(brakeForce, 0);
        vehicle.setBrake(brakeForce, 1);
        vehicle.setBrake(brakeForce, 2);
        vehicle.setBrake(brakeForce, 3);
    }

    vehicle.setSteeringValue(steer, 0);
    vehicle.setSteeringValue(steer, 1);
}

let updateCamera = () => {
    camera.position.lerp(followCam.getWorldPosition(new THREE.Vector3()), 0.05);
    camera.lookAt(vehicle.chassisBody.threemesh.position);
}


let animate = () => {
    requestAnimationFrame(animate)

    const now = Date.now();
    if (lastTime === undefined) lastTime = now;
    const dt = (Date.now() - lastTime) / 1000.0;
    lastTime = now;

    world.step(fixedTimeStep, dt);
    helper.updateBodies(world);

    updateDrive();
    // updateCamera();

    renderer.render(scene, camera);
}


class JoyStick {
    constructor (options) {
        const circle = document.createElement("div");
        circle.style.cssText = "position:absolute; bottom:35px; width:80px; height:80px; background:rgba(126, 126, 126, 0.5); border:#444 solid medium; border-radius:50%; left:50%; transform:translateX(-50%);";
        const thumb = document.createElement("div");
        thumb.style.cssText = "position: absolute; left: 20px; top: 20px; width: 40px; height: 40px; border-radius: 50%; background: #fff;";
        circle.appendChild(thumb);
        document.body.appendChild(circle);
        this.domElement = thumb;
        this.maxRadius = options.maxRadius || 40;
        this.maxRadiusSquared = this.maxRadius * this.maxRadius;
        this.onMove = options.onMove;
        this.origin = { left: this.domElement.offsetLeft, top: this.domElement.offsetTop };
        this.rotationDamping = options.rotationDamping || 0.06;
        this.moveDamping = options.moveDamping || 0.01;
        if (this.domElement != undefined) {
            const joystick = this;
            if ('ontouchstart' in window) {
                this.domElement.addEventListener('touchstart', function (evt) { joystick.tap(evt); });
            } else {
                this.domElement.addEventListener('mousedown', function (evt) { joystick.tap(evt); });
            }
        }
    }

    getMousePosition(evt) {
        let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
        let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
        return { x: clientX, y: clientY };
    }

    tap(evt) {
        evt = evt || window.event;
        // get the mouse cursor position at startup:
        this.offset = this.getMousePosition(evt);
        const joystick = this;
        if ('ontouchstart' in window) {
            document.ontouchmove = function (evt) { joystick.move(evt); };
            document.ontouchend = function (evt) { joystick.up(evt); };
        } else {
            document.onmousemove = function (evt) { joystick.move(evt); };
            document.onmouseup = function (evt) { joystick.up(evt); };
        }
    }

    move(evt) {
        evt = evt || window.event;
        const mouse = this.getMousePosition(evt);
        // calculate the new cursor position:
        let left = mouse.x - this.offset.x;
        let top = mouse.y - this.offset.y;
        //this.offset = mouse;

        const sqMag = left * left + top * top;
        if (sqMag > this.maxRadiusSquared) {
            //Only use sqrt if essential
            const magnitude = Math.sqrt(sqMag);
            left /= magnitude;
            top /= magnitude;
            left *= this.maxRadius;
            top *= this.maxRadius;
        }
        // set the element's new position:
        this.domElement.style.top = `${top + this.domElement.clientHeight / 2}px`;
        this.domElement.style.left = `${left + this.domElement.clientWidth / 2}px`;

        const forward = -(top - this.origin.top + this.domElement.clientHeight / 2) / this.maxRadius;
        const turn = (left - this.origin.left + this.domElement.clientWidth / 2) / this.maxRadius;

        if (this.onMove != undefined) this.onMove(forward, turn);
    }

    up(evt) {
        if ('ontouchstart' in window) {
            document.ontouchmove = null;
            document.touchend = null;
        } else {
            document.onmousemove = null;
            document.onmouseup = null;
        }
        this.domElement.style.top = `${this.origin.top}px`;
        this.domElement.style.left = `${this.origin.left}px`;

        this.onMove(0, 0);
    }
}


init()