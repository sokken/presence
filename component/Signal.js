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

const log = require( './Log')( 'signal' );
const Emitter = require( './Events' ).Emitter;
const util = require( 'util' );

var ns = {};

ns.Signal = function( conf ) {
	const self = this;
	self.roomId = conf.roomId;
	self.roomName = conf.roomName;
	self.persistent = conf.persistent;
	self.accountId = conf.accountId;
	self.accountName = conf.accountName;
	self.avatar = conf.avatar;
	self.guest = conf.guest;
	Emitter.call( self );
	
	self.subs = {};
	self.peers = {};
	
	self.toRoomQueue = [];
	self.toAccountQueue = [];
	
	self.init();
}

util.inherits( ns.Signal, Emitter );

// Room interface

ns.Signal.prototype.send = function( event ) {
	const self = this;
	if ( !self.emitToAccount ) {
		self.toAccountQueue.push( event );
		return;
	}
	
	self.emitToAccount( event );
}

ns.Signal.prototype.setRoomPersistent = function( isPersist, name ) {
	const self = this;
	self.persistent = isPersist;
	self.roomName = name;
	const persistent = {
		type : 'persistent',
		data : {
			persistent : isPersist,
			name       : name,
		},
	};
	self.send( persistent );
}

ns.Signal.prototype.close = function() {
	const self = this;
	const onclose = self.onclose;
	
	self.toRoomQueue = [];
	self.toAccountQueue = [];
	
	delete self.onclose;
	delete self.roomId;
	delete self.accountId;
	delete self.emitToAccount;
	
	if ( onclose )
		onclose();
}

// Account interface

ns.Signal.prototype.toRoom = function( event ) {
	const self = this;
	self.emitToRoom( event );
}

ns.Signal.prototype.setIdentity = function( identity ) {
	const self = this;
	const id = {
		type : 'identity',
		data : identity,
	};
	self.emitToRoom( id );
}

// go offline ( ex: when account closes )
ns.Signal.prototype.disconnect = function() {
	const self = this;
	const dis = { type : 'disconnect', };
	self.emitToRoom( dis );
}

// Are you sure you want to .leave()? You might be looking for .disconnect()..
// removes user from room / authorizations
ns.Signal.prototype.leave = function() {
	const self = this;
	const leave = { type : 'leave', };
	self.emitToRoom( leave );
}

// account sets callback for events from room
ns.Signal.prototype.setToAccount = function( fn ) {
	const self = this;
	self.emitToAccount = fn;
	if ( !self.toAccountQueue.length )
		return;
	
	self.toAccountQueue.forEach( emit );
	self.toAccountQueue = [];
	
	function emit( event ) { self.emitToAccount( event ); }
}

ns.Signal.prototype.setOnclose = function( fn ) {
	const self = this;
	self.onclose = fn;
}

// Private

ns.Signal.prototype.init = function() {
	const self = this;
	/*
	log( 'account<->room bridge nominal..', {
		rid : self.roomId,
		aid : self.accountId,
	});
	*/
}

ns.Signal.prototype.emitToRoom = function( event ) {
	const self = this;
	const unknown = self.emit( event.type, event.data );
	if ( unknown )
		log( 'emitToRoom - unknown', unknown, 4 );
}

module.exports = ns.Signal;
