import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { CLASSES } from '../../data/content';
import { createRoom, joinRoom, leaveRoom, selectClass, startGame, updateSeatReady, subscribeToRoom } from '../../net/roomService';
import type { RoomDoc } from '../../net/types';

interface Seat {
  seatIndex: number;
  occupantUid?: string;
  nickname?: string;
  classId?: string;
  ready: boolean;
}

export function LobbyScreen() {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { room, myUid, setRoom } = useGameStore();

  const [nickname, setNickname] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState(urlRoomCode || '');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState<RoomDoc | null>(null);

  const [seats, setSeats] = useState<Seat[]>(
    Array.from({ length: 6 }, (_, i) => ({
      seatIndex: i,
      ready: false,
    }))
  );

  // Subscribe to room updates
  useEffect(() => {
    if (!room?.code) return;

    const unsubscribe = subscribeToRoom(room.code, (updatedRoom) => {
      if (updatedRoom) {
        setRoomData(updatedRoom);
        setSeats(updatedRoom.seats.map(seat => ({
          seatIndex: seat.seatIndex,
          occupantUid: seat.uid || undefined,
          nickname: seat.nickname || undefined,
          classId: seat.classId || undefined,
          ready: seat.ready || false,
        })));

        // Update room owner if changed
        if (updatedRoom.ownerUid !== room.ownerUid) {
          setRoom({ ...room, ownerUid: updatedRoom.ownerUid });
        }

        // Navigate to game if started
        if (updatedRoom.gameId) {
          navigate(`/game/${updatedRoom.gameId}`);
        }
      }
    });

    return () => unsubscribe();
  }, [room?.code, navigate, setRoom]);

  const mySeat = seats.find(s => s.occupantUid === myUid);
  const isOwner = roomData?.ownerUid === myUid || room?.ownerUid === myUid;
  const canStart = isOwner &&
    seats.filter(s => s.occupantUid).length >= 2 &&
    seats.filter(s => s.occupantUid).length <= 6 &&
    seats.filter(s => s.occupantUid).every(s => s.ready);

  const takenClasses = seats.filter(s => s.classId).map(s => s.classId);

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    if (!roomCodeInput && !urlRoomCode) {
      // Create new room
      setIsJoining(true);
      try {
        const newRoomCode = await createRoom(nickname);
        setRoom({ id: newRoomCode, code: newRoomCode, ownerUid: myUid! });
        navigate(`/lobby/${newRoomCode}`);
      } catch (err: any) {
        console.error('Failed to create room:', err);
        setError(err.message || 'Failed to create room');
      }
      setIsJoining(false);
    } else {
      // Join existing room
      const code = roomCodeInput || urlRoomCode;
      setIsJoining(true);
      try {
        await joinRoom(code!, nickname);
        setRoom({ id: code!, code: code!, ownerUid: roomData?.ownerUid || '' });

        // Room subscription will handle seat updates
      } catch (err: any) {
        console.error('Failed to join room:', err);
        setError(err.message || 'Failed to join room');
      }
      setIsJoining(false);
    }
  };

  const handleSelectSeat = async (seatIndex: number) => {
    // In mock mode, seats are handled by join/leave room
    // This function is mainly for UI feedback now
    if (!mySeat && seats[seatIndex].occupantUid === undefined && room?.code && nickname) {
      try {
        await joinRoom(room.code, nickname);
      } catch (err: any) {
        console.error('Failed to take seat:', err);
        setError(err.message || 'Failed to take seat');
      }
    }
  };

  const handleLeaveSeat = async () => {
    if (mySeat && room?.code) {
      try {
        await leaveRoom(room.code);
        // Room subscription will handle seat updates
      } catch (err: any) {
        console.error('Failed to leave seat:', err);
        setError(err.message || 'Failed to leave seat');
      }
    }
  };

  const handleSelectClass = async (classId: string) => {
    if (mySeat && !takenClasses.includes(classId) && room?.code) {
      try {
        await selectClass(room.code, classId);
        // Room subscription will handle seat updates
      } catch (err: any) {
        console.error('Failed to select class:', err);
        setError(err.message || 'Failed to select class');
      }
    }
  };

  const handleToggleReady = async () => {
    if (mySeat && mySeat.classId && room?.code) {
      try {
        await updateSeatReady(room.code, !mySeat.ready);
        // Room subscription will handle seat updates
      } catch (err: any) {
        console.error('Failed to toggle ready:', err);
        setError(err.message || 'Failed to toggle ready');
      }
    }
  };

  const handleStartGame = async () => {
    if (canStart && room?.code) {
      try {
        await startGame(room.code);
        // Room subscription will handle navigation when game starts
      } catch (err: any) {
        console.error('Failed to start game:', err);
        setError(err.message || 'Failed to start game');
      }
    }
  };

  if (!room && !isJoining) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
            King of the Mountain
          </h1>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              maxLength={20}
              data-testid="input-nickname"
            />

            <input
              type="text"
              placeholder="Room code (leave empty to create)"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              maxLength={6}
              data-testid="input-room-code"
            />

            {error && (
              <div className="text-red-500 text-sm" role="alert">
                {error}
              </div>
            )}

            <button
              onClick={handleJoinRoom}
              disabled={isJoining || !nickname.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              data-testid="btn-join-room"
            >
              {roomCodeInput ? 'Join Room' : 'Create Room'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Room: {room?.code}
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {isOwner && '👑 Room Owner'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Players ({seats.filter(s => s.occupantUid).length}/6)
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {seats.map((seat) => (
                <div
                  key={seat.seatIndex}
                  className={`
                    border-2 rounded-lg p-3 transition-all cursor-pointer
                    ${seat.occupantUid
                      ? seat.ready
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }
                    ${seat.occupantUid === myUid ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => !seat.occupantUid && !mySeat && handleSelectSeat(seat.seatIndex)}
                  data-testid={`seat-${seat.seatIndex}`}
                >
                  {seat.occupantUid ? (
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-white">
                        {seat.nickname}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {seat.classId ? CLASSES[seat.classId]?.name : 'No class'}
                      </div>
                      {seat.ready && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Ready
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500">
                      Empty Seat
                    </div>
                  )}
                </div>
              ))}
            </div>

            {mySeat && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleToggleReady}
                  disabled={!mySeat.classId}
                  className={`
                    w-full py-2 px-4 rounded-lg font-semibold transition-colors
                    ${mySeat.ready
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-400'
                    }
                  `}
                  data-testid="btn-ready"
                >
                  {mySeat.ready ? 'Ready!' : 'Ready Up'}
                </button>

                <button
                  onClick={handleLeaveSeat}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                  data-testid="btn-leave-seat"
                >
                  Leave Seat
                </button>
              </div>
            )}
          </div>

          {/* Class Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Select Your Class
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(CLASSES).map(([classId, classData]) => {
                const isTaken = takenClasses.includes(classId);
                const isSelected = mySeat?.classId === classId;

                return (
                  <div
                    key={classId}
                    className={`
                      border rounded-lg p-3 transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isTaken
                        ? 'border-gray-300 bg-gray-100 dark:bg-gray-700/50 opacity-50 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 cursor-pointer'
                      }
                    `}
                    onClick={() => !isTaken && mySeat && handleSelectClass(classId)}
                    data-testid={`class-${classId}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 dark:text-white">
                          {classData.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {classData.passive}
                        </div>
                        {classData.startItems && classData.startItems.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Starts with: {classData.startItems.join(', ')}
                          </div>
                        )}
                      </div>
                      {isTaken && (
                        <div className="text-xs text-red-500 ml-2">
                          Taken
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start Game Button */}
        {isOwner && (
          <div className="max-w-6xl mx-auto mt-6">
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
              data-testid="btn-start-game"
            >
              {canStart
                ? 'Start Game'
                : seats.filter(s => s.occupantUid).length < 2
                ? 'Need at least 2 players'
                : 'Waiting for all players to be ready'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}