'use strict';

/*©agpl*************************************************************************
*                                                                              *
* Friend Unifying Platform                                                     *
* ------------------------                                                     *
*                                                                              *
* Copyright 2014-2016 Friend Software Labs AS, all rights reserved.            *
* Hillevaagsveien 14, 4016 Stavanger, Norway                                   *
* Tel.: (+47) 40 72 96 56                                                      *
* Mail: info@friendos.com                                                      *
*                                                                              *
*****************************************************************************©*/

const log = require( './Log' )( 'Session' );
const Emitter = require( './Events' ).Emitter;
const util = require( 'util' );

const ns = {};
ns.Session = function( id, accountId, onclose ) {
	const self = this;
	self.id = id;
	self.accountId = accountId;
	self.onclose = onclose;
	
	self.sessionTimeout = 1000 * 60;
	self.sessionTimer = null;
	self.connections = {};
	self.connIds = [];
	
	Emitter.call( self );
	
	self.init();
}

util.inherits( ns.Session, Emitter );

// Public

// system attaches a new client connection
ns.Session.prototype.attach = function( conn ) {
	const self = this;
	log( 'attach', conn.id );
	if ( !conn )
		return;
	
	if ( self.sessionTimer ) {
		clearTimeout( self.sessionTimer );
		self.sessionTimer = null;
	}
	
	const cid = conn.id;
	self.connections[ cid ] = conn;
	self.connIds.push( cid );
	conn.on( 'msg', handleEvent );
	conn.setSession( self.id );
	
	function handleEvent( e ) { self.handleEvent( e, cid ); }
}

// system detaches a ( most likely closed ) client connection
ns.Session.prototype.detach = function( cid, callback ) {
	const self = this;
	log( 'detach', cid );
	const conn = self.connections[ cid ];
	if ( !conn ) {
		if ( callback )
			callback( null );
		return;
	}
	
	conn.unsetSession( setBack );
	function setBack() {
		conn.release( 'msg' );
		delete self.connections[ cid ];
		self.connIds = Object.keys( self.connections );
		if ( !self.checkConnsTimeout )
			self.checkConnsTimeout = setTimeout( checkConns, 1000 );
		
		if ( callback )
			callback( conn );
	}
	
	function checkConns() {
		self.checkConns();
	}
}

// account sends events to client(s), clientId is optional
/*
arguments:
	( event ) OR
	( event, clientId ) OR
	( event, callback ) OR 
	( event, clientId, callback )
*/
ns.Session.prototype.send = function() {
	const self = this;
	const event = arguments[ 0 ];
	if ( !event ) {
		log( 'send - no event', event );
		return;
	}
	
	var clientId = undefined;
	var callback = undefined;
	var arg2 = arguments[ 1 ];
	var arg3 = arguments[ 2 ];
	var type2 = null;
	var type3 = null;
	if ( arg2 )
		type2 = typeof( arg2 );
	if ( arg3 )
		type3 = typeof( arg3);
	
	if ( 2 === arguments.length ) {
		if ( 'string' === type2 )
			clientId = arg2;
		if ( 'function' === type2 )
			callback = arg2;
	}
	
	if ( 3 === arguments.length ) {
		if ( 'string' !== type2 && !( null == arg2 )) {
			log( 'send - invalid arg2', type2 );
			return;
		}
		
		clientId = arg2;
		if ( 'function' === type3 )
			callback = arg3;
	}
	
	if ( clientId )
		self.sendOnConn( event, clientId, callback );
	else
		self.broadcast( event, callback );
}

// closes session, either from account( logout ), from lack of client connections
// or from nomansland for whatever reason
ns.Session.prototype.close = function() {
	log( 'close' );
	const self = this;
	if ( self.checkConnsTimeout )
		clearTimeout( self.checkConnsTimeout );
	
	if ( self.sessionTimer ) {
		clearTimeout( self.sessionTimer );
		self.sessionTimer = null;
	}
	
	const onclose = self.onclose;
	delete self.onclose;
	
	self.emitterClose();
	self.clearConns();
	
	if ( onclose )
		onclose();
}

// Private

ns.Session.prototype.init = function() {
	const self = this;
	log( 'init ' );
}

ns.Session.prototype.handleEvent = function( event, clientId ) {
	const self = this;
	self.emit(
		event.type,
		event.data,
		clientId
	);
}

ns.Session.prototype.broadcast = function( event, callback ) {
	const self = this;
	const lastIndex = ( self.connIds.length -1 );
	self.connIds.forEach( sendTo );
	function sendTo( cid, index ) {
		if ( index === lastIndex )
			self.sendOnConn( event, cid,callback );
		else
			self.sendOnConn( event, cid );
	}
}

ns.Session.prototype.sendOnConn = function( event, cid, callback ) {
	const self = this;
	const conn = self.connections[ cid ];
	if ( !conn ) {
		log( 'no conn for id', {
			cid   : cid,
			conns : self.connections }, 3 );
		if ( callback )
			callback();
		return;
	}
	
	conn.send( event, callback );
}

ns.Session.prototype.checkConns = function() {
	const self = this;
	self.checkConnsTimeout = null
	if ( self.connIds.length )
		return;
	
	self.sessionTimer = setTimeout( sessionTimedOut, self.sessionTimeout );
	function sessionTimedOut() {
		self.sessionTimer = null;
		self.close();
	}
}

ns.Session.prototype.clearConns = function() {
	const self = this;
	self.connIds.forEach( unsetSession );
	self.connections = {};
	self.connIds = [];
	
	function unsetSession( cid ) {
		const conn = self.connections[ cid ];
		if ( !conn )
			return;
		
		conn.unsetSession();
	}
}

module.exports = ns.Session;
