document.addEventListener('init', (e)=>{
    let {app} = e
    let THREE = app.THREE
    
    let debugCol = app.urlParams.get('debugCol') || false;
    let debugJoints = app.urlParams.get('debugJoints') || false;

    app.orbitControls.enableDamping = true;
    app.orbitControls.dampingFactor = 0.1;
    let loader = new app.GLTFLoader()
    let mixer;

    loader.load('standardbot.283.glb', (gltf)=>{
        let body = gltf.scene.getObjectByName('body');
        body && app.scene.add(body)

        let jnames = {}
        let joints = []
        let target = body.getObjectByName('end_effector')
        let base = body.getObjectByName('body')
        base && app.scene.add(base)

        body.traverse(e=>{
            if (e.isSkinnedMesh) {
                e.frustumCulled = false;

            }
            if (e.isMesh) {
                e.castShadow = true;
                e.receiveShadow = true;
                app.elements.elements.push(e.parent)
                e.material.dithering = true;
                console.log(e.material.type)
            }
            if (e.name.indexOf('j_') == 0) {
                joints.push(e)
                jnames[e.name] = e;
                console.log(e.name + ':' + e.type + ' rz:' + e.rotation.z)
            }
        }
        )

        if (target) {
            let light1 = new THREE.SpotLight(0xff0000,10.0,50,Math.PI * .1,.1,0)
            //,10, 45, 15, 0);
            if (debugCol)
                app.scene.add(new THREE.SpotLightHelper(light1))
            target.add(light1)
            light1.add(light1.target)

            light1.position.set(0, -.21, 0);
            light1.target.position.set(0, -150.1, 1)
            light1.rotation.x = Math.PI

            light1.castShadow = true;
            var setShadowSize = (sz,mapSz)=>{
                light1.shadow.camera.left = sz;
                light1.shadow.camera.bottom = sz;
                light1.shadow.camera.right = -sz;
                light1.shadow.camera.top = -sz;
                light1.shadow.camera.near = .1;
                light1.shadow.camera.far = 150;
                if (mapSz) {
                    light1.shadow.mapSize.set(mapSz, mapSz);
                }
            }
            ;
            setShadowSize(15, 1024);
            light1.shadow.bias = -0.0001
            light1.shadow.radius = 4;
        }
        app.transformControls.enabled = app.transformControls.visible = false
        let atime = 0;
        let arate = 0;
        let secs = ()=>performance.now() / 1000.
        let lastTime = secs()

        let colSphere = new THREE.Mesh(new THREE.SphereGeometry(.5,16,16),new THREE.MeshStandardMaterial({
            color: 'red',
            metalness: .8,
            roughness: .1,
            transparent: true,
            opacity: debugCol ? .5 : 0
        }))

        base.userData.colBox = new THREE.Mesh(new THREE.BoxGeometry(2,2,2),colSphere.material);
        base.add(base.userData.colBox)

        if (!debugCol)
            base.userData.colBox.visible = false;

        base.updateMatrix();
        sv = base.children;
        base.children = [base.children[0]]

        let ground = base.clone();

        let v0 = new THREE.Vector3();
        let v1 = new THREE.Vector3();

        let bbox = new THREE.Box3().setFromObject(base)
        base.children = sv;
        bbox.getSize(base.userData.colBox.scale).multiplyScalar(.5)
        base.userData.colBox.center = base.worldToLocal(bbox.getCenter(v0.clone()))

        let bbox1 = new THREE.Box3().setFromObject(ground)
        bbox1.expandByVector(new THREE.Vector3(100,0,100))
        bbox1.translate(new THREE.Vector3(0,-1.8,0))

        ground.userData.colBox = base.userData.colBox.clone()
        bbox1.getSize(ground.userData.colBox.scale).multiplyScalar(.5)
        ground.userData.colBox.center = ground.worldToLocal(bbox1.getCenter(v0.clone()))
        ground.userData.colBox.position.copy(ground.userData.colBox.center)

        base.parent.add(ground)
        ground.visible = false;
        ground.add(ground.userData.colBox)

        ground.updateMatrixWorld()
        //base.parent.add(ground)

        let isPoseValid = (rig)=>{
            let joints = rig.joints
            for (let c = 0; c < rig.colliders.length; c++) {

                for (let cc = c; cc < rig.colliders.length; cc++) {
                    let j = rig.colliders[c]
                    j.material.opacity *= .98

                    j.material.opacity = Math.max(debugCol ? .2 : 0, j.material.opacity);

                    if (j.material.opacity < .01)
                        j.visible = false;
                    //j.visible = true;
                    if (c !== cc) {
                        let jj = rig.colliders[cc]
                        if (j.jointIndex !== jj.jointIndex) {
                            j.localToWorld(v0.set(0, 0, 0))
                            jj.localToWorld(v1.set(0, 0, 0))
                            let len = v1.distanceTo(v0);
                            if (len < (j.userData.radius + jj.userData.radius)) {
                                console.log("Hit:", c, cc)
                                return false;
                            }
                        }
                    } else {
                        let j = rig.colliders[c]
                        let collideBox = (base,j)=>{
                            base.worldToLocal(j.localToWorld(v0.set(0, 0, 0))).sub(base.userData.colBox.center)
                            let sz = base.userData.colBox.scale;
                            let r = j.userData.radius;
                            if ((Math.abs(v0.x) < sz.x + r) && (Math.abs(v0.y) < sz.y + r) && (Math.abs(v0.z) < sz.z + r)) {
                                console.log("Hit:", c, -1)
                                j.material.opacity = Math.min(.5, j.material.opacity + .1)
                                j.visible = true;
                                return true
                            }
                        }
                        if (collideBox(base, j))
                            return false
                        if (collideBox(ground, j))
                            return false
                    }

                    //j.visible = false;
                }
            }
            return true;
        }

        let mkrig = ()=>{
            return {
                joints: [],
                jointsByName: {},
                colliders: [],
                update:function(dt){
                    for(let i=0;i<joints.length;i++){
                        let j=joints[i]
                        let jnt = j.userData.joint
                        if(j.userData.target){
                            let t=j.userData.target
                            if(t[jnt.axis]&&t[jnt.axis]!=j.rotation[jnt.axis]){
                                let delt =  t[jnt.axis] - j.rotation[jnt.axis] ;
                                if(delt<-jnt.maxVel)delt = -jnt.maxVel
                                else if(delt>jnt.maxVel)delt = jnt.maxVel
                                this.moveJoint(jnt.object.name,delt)
                            }else if(t[jnt.axis])delete t[jnt.axis]
                        }
                    }
                },
                poseToString:function(){
                    return JSON.stringify(this.joints.map(e=>e.object.rotation[e.axis]));
                },
                stringToPose:function(str){
                    if(!str)return;
                    let state = JSON.parse(str)
                    this.joints.map((e,i)=>e.object.rotation[e.axis] = state[i])
                },
                stringToPoseTarget:function(str){
                    if(!str)return;
                    let state = JSON.parse(str)
                    this.joints.map((e,i)=>e.object.userData.target={})
                    this.joints.map((e,i)=>e.object.userData.target[e.axis] = state[i])
                    //this.joints.map((e,i)=>e.object.rotation[e.axis] = state[i])
                },
                moveJoint: function(name, value) {
                    let j = this.jointsByName[name]
                    if (!j)
                        return false

                    if (j.object.rotation[j.axis] === 'undefined')
                        j.object.rotation[j.axis] = 0

                    value = j.object.rotation[j.axis] + value;
                    let nvalue = value < j.min ? j.min : value > j.max ? j.max : value;

                    let sv = j.object.rotation[j.axis];

                    if (j.axis == 'time') {
                        //nvalue = Math.min(1,Math.max(0,nvalue))
                        this.mixer.setTime(nvalue)
                        this.mixer.update(0)
                    }
                    j.object.rotation[j.axis] = nvalue

                    j.object.updateMatrixWorld()
                    if (!isPoseValid(this)) {
                        j.object.rotation[j.axis] = sv;
                        j.object.updateMatrixWorld()
                        return false;
                    }

                    return nvalue != value ? false : true;
                },
                mkjoint: function(oname, axis='x', min=-Infinity, max=Infinity,maxVel=0.03) {
                    let object = jnames[oname]
                    if (!object)
                        console.log('joint obj not found:', oname)
                    let j = object.userData.joint = {
                        object,
                        axis,
                        min,
                        max,
                        maxVel,
                        colliders: [],
                        index: this.joints.length
                    }
                    this.jointsByName[object.name] = j
                    this.joints.push(j)
                    object.userData.defRotation = object.rotation.clone();

                    this.activeJoint = j

                    if (oname.indexOf('gripper_t') > 0) {
                        //Special case for gripper.. needs a collision proxy bc skinnedmeshes don't raycast well..
                        console.log("got gripper")

                        let gprox = new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.2),new THREE.MeshStandardMaterial({
                            opacity: .03,
                            transparent: true
                        }))
                        gprox.position.y += .20;
                        gprox.name = 'gripper_proxy'
                        this.jointsByName[gprox.name] = j;
                        j.object.add(gprox)
                        app.elements.elements.push(gprox)
                        gprox.visible = false;
                    }

                    return this
                },
                addColSphere: function(radius=.1, x=0, y=0, z=0, boneName) {
                    let joint = this.activeJoint;
                    let c = colSphere.clone();
                    c.userData.radius = radius
                    c.position.set(x, y, z);
                    c.scale.multiplyScalar(radius * 2)

                    if (boneName) {
                        let bone = joint.object.getObjectByName(boneName)
                        if (!bone)
                            console.log("Bone:" + boneName + " not found.")
                        bone.add(c)
                    } else
                        joint.object.add(c)
                    joint.colliders.push(c)
                    this.colliders.push(c)
                    c.jointIndex = joint.index;
                    // c.visible = false;
                    c.material = c.material.clone();
                    return this;
                }
            }
        }

        let rig = mkrig();
        let r0 = .18 * .6
        let r1 = .15
        let r2 = .14
        let r3 = .05
        rig.mkjoint('j_1_z', 'y').addColSphere(r0, 0, -.14, 0).addColSphere(r0, 0, .15, 0)
        rig.mkjoint('j_2_z', 'x').addColSphere(r1, -0.21, 0, 0).addColSphere(r1, 0.0, 0, 0).addColSphere(r1, 0.0, .4, 0).addColSphere(r1, 0.0, .8, 0)
        rig.mkjoint('j_4_x', 'x').addColSphere(r1, 0, 0, 0).addColSphere(r1, .27, 0, 0).addColSphere(r1, .27, 0.4, 0).addColSphere(r1, .27, .85, 0)

        rig.mkjoint('j_6_z', 'x').addColSphere(r1, 0, 0, 0)
        //        rig.mkjoint('j_5', 'y');

        rig.mkjoint('j_7_z', 'z').addColSphere(r2, 0, 0, -.05).addColSphere(r2, 0, 0, .12)
        rig.mkjoint('j_8_z', 'y',-Infinity,Infinity,0.25).addColSphere(r2 / 2, 0, .0, 0, target.name).addColSphere(r2, 0, .3, 0).addColSphere(r2, 0, .0, 0).addColSphere(r2, 0, -.4, 0);

        rig.mkjoint('j_gripper_t', 'time', 0, 2.2).addColSphere(r3, -.05, .17, 0, "bgl1").addColSphere(r3, .05, .17, 0, "bgr1")

        rig.mixer = new THREE.AnimationMixer(body);
        gltf.animations.forEach((clip)=>{
            let ca = rig.mixer.clipAction(clip).play();
            ca.setLoop(THREE.LoopPingPong)
        }
        );

        if(debugJoints)
            for (let i = 0; i < rig.joints.length; i++)
                new JointControls(THREE,rig.joints[i].object,rig.joints[i].axis);

        let keycmds = {

        }
        document.addEventListener('keydown', (e)=>{
            let dig;
            if(e.code.indexOf('Digit')==0)
            {   dig = parseInt(e.code.slice(-1))
                if(dig<0||dig>9)return;
                if(e.shiftKey)
                    localStorage["pose_"+dig]=rig.poseToString()
                else
                    rig.stringToPoseTarget(localStorage["pose_"+dig])
                console.log(dig)
            }
        })

        document.addEventListener('mouseup', (e)=>{
            localStorage.jointState = rig.poseToString();
        }
        )

        if (localStorage.jointState) {
            rig.stringToPose(localStorage.jointState)
        }
let clock = new THREE.Clock()
        document.addEventListener('beforeRender', (e)=>{
            let d = clock.getDelta()
            let t = secs()
            if (app.mouse.buttons == 2) {
                arate += 0.001;
                if (arate > 1)
                    arate = 1;
            } else if (app.mouse.buttons == 1) {
                arate -= 0.001;
                if (arate < -1)
                    arate = -1;
            } else
                arate *= 0.9;

            atime += (t - lastTime) * arate;

            lastTime = t;
            t = atime;
            //app.elements.selection
            let sel = app.elements.selection;
            let ded = []
            for (let si = 0; si < sel.length; si++) {
                if (!rig.jointsByName[sel[si].name])
                    ded.push(sel[si])
                if(arate!=0){
                    if (!rig.moveJoint(sel[si].name, arate))
                        arate = 0
                }
            }
            if (ded.length)
                app.elements.clearSelection()

            //for(let si=0;si<ded.length;si++)
            //app.elements.deselect(ded[si]);
            rig.update(d)
        }
        )

    }
    )

}
)
