import fontData400 from "./asset/firacode-400.json";
import fontData700 from "./asset/firacode-700.json";
import * as three from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";

export default class Font {

	#dom;

	#type;

	#scale;

	#space;

	#entity;

	#height;

	#message;

	#position;

	#thickness;

	/**
	 * 构造字体。
	 * @param { Object } options - 配置。
	 * @param { number } options.message - 文本。
	 * @param { number } options.height - 字符高度，比如100。
	 * @param { number } options.space - 垂直方向上的字符间距，比如10。
	 * @param { number } options.thickness - 线宽，比如2。
	 * @param { string } options.type - "fillline"或"outline"。
	 * @param { Array<number> } options.position - 实例的位置。
	 * @returns { Object } - 实例。
	 */
	constructor ( { message, height, space, thickness, type, position } ) {

		this.#scale = 1;
		this.#type = type;
		this.#space = space;
		this.#height = height;
		this.#message = message;
		this.#position = position;
		this.#thickness = thickness;

		const ThisLine = type === "fillline" ? FillLine : Outline;
		const fontData = type === "fillline" ? fontData400 : fontData700;

		const font = new FontLoader().parse( fontData );
		const shapes = font.generateShapes( message, height );

		this.#entity = new ThisLine( { paths: shapes, message, thickness, space } );
		this.#entity.position.set( ... position );

	}

	getEntity () {

		return this.#entity;

	}

	getMessage () {

		return this.#message;

	}

	getHeight () {

		/*
		 * BUG this.#height是一个永恒不变的值，这会导致一些违反直觉的现象。比如调用了setScale之后，实例的
		 * BUG 实际高度是this.getHeight() * this.getScale()，而不是this.getHeight()。
		 */
		return this.#height;

	}

	getSpace () {

		return this.#space;

	}

	getThickness () {

		return this.#thickness;

	}

	getType () {

		return this.#type;

	}

	getDom () {

		if ( this.#dom ) return this.#dom;

		let [ x, y ] = this.getPosition();

		x = x + globalThis.innerWidth / 2;
		y = - 1 * y + globalThis.innerHeight / 2;

		this.#dom = document.createElement( "button" );
		this.#dom.className = "font-dom";
		this.#dom.style.height = this.getScale() * this.getHeight() + "px";
		this.#dom.style.width = this.getScale() * this.getHeight() * Array.from( this.getMessage() ).length + "px";
		this.#dom.style.left = x + "px";
		this.#dom.style.top = y + "px";

		return this.#dom;

	}

	getPosition () {

		return this.#position;

	}

	getScale () {

		return this.#scale;

	}

	/**
	 * 设置位置。
	 * @param { number } x - x坐标。
	 * @param { number } y - y坐标。
	 * @param { number } z - z坐标。
	 */
	setPosition ( x, y, z ) {

		this.#position = [ x, y, z ];
		this.getEntity().position.set( x, y, z );

	}

	/**
	 * 缩放至原始大小的n倍。
	 * @param { number } n - 缩放倍数。
	 */
	setScale ( n ) {

		this.#scale = n;
		this.getEntity().scale.set( n, n, n );

	}

	/**
	 * 更新dom的宽高与位置，当实例的position或scale发生变化后，都应该调用此方法。
	 */
	updateDom () {

		let [ x, y ] = this.getPosition();

		x = x + globalThis.innerWidth / 2;
		y = - 1 * y + globalThis.innerHeight / 2;

		this.getDom().style.height = this.getScale() * this.getHeight() + "px";
		this.getDom().style.width = this.getScale() * this.getHeight() * Array.from( this.getMessage() ).length + "px";
		this.getDom().style.left = x + "px";
		this.getDom().style.top = y + "px";

	}

}

const thinOutlineMaterial = new three.LineBasicMaterial( {
	linewidth: 1,
	linecap: "round",
	linejoin: "round",
	vertexColors: true,
} );

/**
 * 构造细线，该线条的宽度恒定为1。
 * @param { Object } path - Path实例。
 * @returns { Object } - Line实例。
 */
function ThinOutline ( path ) {

	const divisions = 12;
	const points = path.getPoints( divisions );

	const colors = [];
	const positions = [];

	for ( let i = 0; i < points.length; i ++ ) {

		const vector2 = points[ i ];

		colors.push( Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1 );
		positions.push( vector2.x, vector2.y, 0 );

	}

	const geometry = new three.BufferGeometry();

	geometry.setAttribute( "color", new three.Float32BufferAttribute( colors, 3 ) );
	geometry.setAttribute( "position", new three.Float32BufferAttribute( positions, 3 ) );
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();

	const line = new three.Line( geometry, thinOutlineMaterial );

	return line;

}

const boldOutlineMaterial = new three.MeshBasicMaterial( {
	vertexColors: true,
	side: three.DoubleSide, // 必需
} );

/**
 * 构造粗线。
 * @param { Object } path - Path实例。
 * @param { number } thickness - 线宽。
 * @returns { Object } - Mesh实例。
 */
function BoldOutline ( path, thickness ) {

	const divisions = 12;
	const points = path.getPoints( divisions );

	const style = SVGLoader.getStrokeStyle( thickness, "rgb(255,255,255)" );
	const geometry = SVGLoader.pointsToStroke( points, style );

	const colors = [];

	let count = geometry.getAttribute( "position" ).count;

	while ( count -- ) colors.push( Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1 );

	geometry.setAttribute( "color", new three.Float32BufferAttribute( colors, 3 ) );

	const mesh = new three.Mesh( geometry, boldOutlineMaterial );

	return mesh;

}

const filllineMaterial = new three.MeshBasicMaterial( {
	vertexColors: true,
	side: three.DoubleSide, // 必需
} );

/**
 * 构造字体的填充线。
 * @param { Array } paths - 由Path实例组成的数组。
 * @returns { Object } - Mesh实例。
 */
function FillLine ( paths ) {

	console.log( paths );

	const geometry = new three.ShapeGeometry( paths );

	const colors = [];

	let count = geometry.getAttribute( "position" ).count;

	while ( count -- ) colors.push( Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1 );

	geometry.setAttribute( "color", new three.Float32BufferAttribute( colors, 3 ) );

	const mesh = new three.Mesh( geometry, filllineMaterial );

	/* 居中 */
	const offset = new three.Box3().expandByObject( mesh ).getCenter( new three.Vector3() );

	geometry.translate( - offset.x, - offset.y, 0 );
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();

	return mesh;

}

/**
 * 构造字体的轮廓线。
 * @param { Object } options
 * @param { Array } options.paths - 由Path实例组成的数组。
 * @param { string } options.message - 文本。
 * @param { number } options.thickness - 线宽。
 * @param { number } options.space - 垂直方向上的字符间距。
 * @returns { Object } - Group实例。
 */
function Outline ( { paths, message, thickness, space } ) {

	const group = new three.Group();
	const ThisLine = thickness === 1 ? ThinOutline : BoldOutline;

	/* 创建线条。 */
	paths.forEach( path => {

		const line = new ThisLine( path, thickness );

		group.add( line );

		if ( ! path.holes ) return;

		if ( ! path.holes.length ) return;

		path.holes.forEach( hole => line.add( new ThisLine( hole, thickness ) ) );

	} );

	/* TODO 清空原间距。 */

	/* 制造垂直间距。 */
	const rows = message.split( "\n" );

	rows.forEach( ( row, index ) => {

		const offset = - index * space;

		const fromIndex = rows.slice( 0, index ).reduce( ( count, string ) => {

			return count + Array.from( string ).length;

		}, 0 );
		const toIndex = fromIndex + Array.from( row ).length;

		for ( let i = fromIndex; i < toIndex; i ++ ) group.children[ i ].translateY( offset );

	} );

	/* 居中。 */
	const offset = new three.Box3().setFromObject( group ).getCenter( new three.Vector3() );

	group.children.forEach( line => {

		line.translateX( - offset.x );
		line.translateY( - offset.y );
		line.translateZ( - offset.z );

	} );

	/* 返回 */
	return group;

}
