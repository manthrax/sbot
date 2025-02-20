class JointControls {
    constructor(THREE, root, axis='y') {
        this.axis = axis;
        this.root = root;
        this.active = true;
        root.updateMatrixWorld()
        sv = root.children
        root.children = []
        let bbox = new THREE.Box3().setFromObject(root);
        root.children = sv;
        let v0 = new THREE.Vector3()
        bbox.getSize(v0)
        let rad;
        let height;
        if (axis == 'y') {
            rad = v0.x * .5;
            height = v0.y;
            //*1.25;
        } else if (axis == 'x') {
            rad = v0.y * .5;
            height = v0.x;

        } else {
            rad = v0.y * .5;
            height = v0.z;

        }
        let fudge = .01
        rad += fudge * .5;
        height += fudge;

        function mkCanvas(dim) {
            var canvas = document.createElement("canvas");
            canvas.width = canvas.height = dim;
            return canvas.getContext("2d");
        }
        function makeProceduralTexture(dim, fn, postfn=()=>{}
        ) {
            var ctx = mkCanvas(dim);
            var pix = ctx.getImageData(0, 0, dim, dim);
            var u32view = new DataView(pix.data.buffer);
            var idx = -4;
            for (var j = 0; j < dim; j++)
                for (var i = 0; i < dim; i++)
                    u32view.setUint32((idx += 4), fn(j / dim, i / dim) | 0);
            ctx.putImageData(pix, 0, 0);
            var tex = new THREE.Texture(ctx.canvas);

            postfn(ctx)

            tex.needsUpdate = true;
            return tex;
        }
        var tx = makeProceduralTexture(1024, (u,v)=>{
            var dark = ((((u * 2) & 1) ^ ((v * 2) & 1)) | 0 ? 1 : 2)
            // if(u<v)dark=false;
            var rb = ((Math.random() * 128) | 0) * dark

            return ((rb * 256) | (rb * 256 * 256) | (rb * 256 * 256 * 256) | 0x000000ff);
        }
        , (ctx)=>{
            ctx.fillRect(200, 200, 300, 300)

            let drawArrow = (x,y,ang=0)=>{
                ctx.beginPath();
                let tlen = 250
                let hedlen = 100
                ctx.translate(x, y)
                ctx.rotate(ang)
                //ctx.fillStyle = 'rgba(0,0,0,0)'

                ctx.globalAlpha = 1;

                ctx.moveTo(-(tlen + (hedlen * 1)), -hedlen);
                ctx.lineTo(tlen, -hedlen);
                ctx.lineTo(tlen, -hedlen * 2);
                ctx.lineTo(tlen + (hedlen * 2), 0);
                ctx.lineTo(tlen, hedlen * 2);
                ctx.lineTo(tlen, hedlen);
                ctx.lineTo(-(tlen + (hedlen * 1)), hedlen);

                ctx.closePath();
                ctx.fill();
                ctx.restore()
            }
            ctx.save()
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            ctx.fillStyle = '#ff0';
            drawArrow(512, 256+64);//256)
            ctx.fillStyle = '#ff0';
            drawArrow(512, (256 * 3)-64, Math.PI)
        }
        );

        //tx.repeat.set(2, 2);
        tx.wrapS = tx.wrapT = THREE.RepeatWrapping;

        let frontMat = new THREE.MeshStandardMaterial({
            emissive: 0xff4000,
            color: 0xff4000,
            transparent: true,
            opacity: .1,
            metalnessMap: tx,
            map: tx

        })
        let bkmat = new THREE.MeshStandardMaterial({
            depthFunc: THREE.GreaterDepth,
            emissive: 0xff4000,
            color: 0xff4000,
            transparent: true,
            opacity: .03,
            metalnessMap: tx,
            map: tx
        })

        this.root.add(this.widgetMesh = new THREE.Mesh(new THREE.CylinderBufferGeometry(rad,rad,height,32,10),frontMat));
        this.widgetMesh.add(this.widgetBack = this.widgetMesh.clone());
        if (axis == 'x') {
            this.widgetMesh.rotation.z = Math.PI * -.5
        } else if (axis == 'z') {
            this.widgetMesh.rotation.x = Math.PI * -.5
        }

        root.worldToLocal(bbox.getCenter(this.widgetMesh.position.set(0, 0, 0)));
        //.multiplyScalar(-1)

        //this.widgetMesh.position.sub(v0)
        this.widgetBack.material = bkmat
    }
}
