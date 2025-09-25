import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Icon,
  Input,
  Panel,
} from '../components/primitives';
import { useGameStore } from '../stores/gameStore';
import { CLASSES } from '../../data/content';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  selectClass,
  startGame,
  subscribeToRoom,
  updateSeatReady,
} from '../../net/roomService';
import type { RoomDoc } from '../../net/types';

interface Seat {
  seatIndex: number;
  occupantUid?: string;
  nickname?: string;
  classId?: string;
  ready: boolean;
}

type ClassFilter = 'all' | 'offense' | 'defense' | 'support' | 'control';

const CLASS_FILTERS: ClassFilter[] = ['all', 'offense', 'defense', 'support', 'control'];

const CLASS_FILTER_LABELS: Record<ClassFilter, string> = {
  all: 'All Classes',
  offense: 'Offense',
  defense: 'Defense',
  support: 'Support',
  control: 'Control',
};

// Manual role mapping keeps the filter chips meaningful until we wire in richer metadata.
const CLASS_CATEGORIES: Record<string, ClassFilter[]> = {
  scout: ['support', 'control'],
  hunter: ['offense'],
  guardian: ['defense'],
  duelist: ['offense', 'control'],
  alchemist: ['support'],
  monk: ['control'],
  raider: ['offense'],
  porter: ['support', 'defense'],
};

const BRAND_ART = 'ui/placeholder-ui.svg';
const CLASS_ART_FALLBACK = 'classes/placeholder-class.svg';

export function LobbyScreen() {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { room, myUid, setRoom } = useGameStore();

  const [nickname, setNickname] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState(urlRoomCode || '');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState<RoomDoc | null>(null);

  // Local seat model lets the layout stay responsive while Firestore pushes propagate.
  const [seats, setSeats] = useState<Seat[]>(
    Array.from({ length: 6 }, (_, index) => ({ seatIndex: index, ready: false }))
  );

  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (!room?.code) {
      return;
    }

    const unsubscribe = subscribeToRoom(room.code, (updatedRoom) => {
      if (!updatedRoom) {
        return;
      }

      setRoomData(updatedRoom);
      setSeats(
        updatedRoom.seats.map((seat) => ({
          seatIndex: seat.seatIndex,
          occupantUid: seat.uid || undefined,
          nickname: seat.nickname || undefined,
          classId: seat.classId || undefined,
          ready: Boolean(seat.ready),
        }))
      );

      setRoom({
        id: room?.id ?? updatedRoom.code,
        code: updatedRoom.code,
        ownerUid: updatedRoom.ownerUid,
        gameId: updatedRoom.gameId ?? undefined,
      });

      if (updatedRoom.gameId) {
        navigate(`/game/${updatedRoom.gameId}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate, room?.code, room?.id, setRoom]);

  const mySeat = useMemo(() => seats.find((seat) => seat.occupantUid === myUid), [myUid, seats]);
  const occupiedCount = useMemo(
    () => seats.filter((seat) => Boolean(seat.occupantUid)).length,
    [seats]
  );
  const readyCount = useMemo(
    () => seats.filter((seat) => seat.occupantUid && seat.ready).length,
    [seats]
  );

  const seatByClassId = useMemo(() => {
    const map = new Map<string, Seat>();
    seats.forEach((seat) => {
      if (seat.classId) {
        map.set(seat.classId, seat);
      }
    });
    return map;
  }, [seats]);

  const filteredClasses = useMemo(
    () =>
      Object.entries(CLASSES).filter(([classId]) => {
        if (classFilter === 'all') {
          return true;
        }

        const categories = CLASS_CATEGORIES[classId] || [];
        return categories.includes(classFilter);
      }),
    [classFilter]
  );

  useEffect(() => {
    if (!filteredClasses.length) {
      setSelectedClassId(null);
      return;
    }

    const hasSelection = filteredClasses.some(([classId]) => classId === selectedClassId);
    if (!hasSelection) {
      setSelectedClassId(filteredClasses[0]?.[0] ?? null);
    }
  }, [filteredClasses, selectedClassId]);

  useEffect(() => {
    if (mySeat?.classId) {
      setSelectedClassId(mySeat.classId);
    }
  }, [mySeat?.classId]);

  const readyNames = useMemo(
    () =>
      seats
        .filter((seat) => seat.occupantUid && seat.ready)
        .map((seat) => seat.nickname || 'Ready Player'),
    [seats]
  );

  const waitingNames = useMemo(
    () =>
      seats
        .filter((seat) => seat.occupantUid && !seat.ready)
        .map((seat) => seat.nickname || 'Picking Class'),
    [seats]
  );

  const takenClasses = useMemo(() => {
    const assigned: string[] = [];
    seats.forEach((seat) => {
      if (seat.classId) {
        assigned.push(seat.classId);
      }
    });
    return assigned;
  }, [seats]);

  const canStart = Boolean(roomData?.ownerUid === myUid || room?.ownerUid === myUid) &&
    occupiedCount >= 2 &&
    occupiedCount <= 6 &&
    occupiedCount === readyCount;

  const selectedClass = selectedClassId ? CLASSES[selectedClassId] : undefined;
  const selectedClassSeat = selectedClassId ? seatByClassId.get(selectedClassId) : undefined;
  const selectedClassCategories = selectedClassId ? CLASS_CATEGORIES[selectedClassId] || [] : [];

  const isOwner = Boolean(roomData?.ownerUid === myUid || room?.ownerUid === myUid);

  useEffect(() => {
    if (nickname || !roomData || !myUid) {
      return;
    }

    const existingNickname = roomData.seats.find((seat) => seat.uid === myUid)?.nickname;
    if (existingNickname) {
      setNickname(existingNickname);
    }
  }, [nickname, roomData, myUid]);

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setError('');
    setIsJoining(true);

    try {
      if (!roomCodeInput && !urlRoomCode) {
        const newRoomCode = await createRoom(nickname.trim());
        setRoom({ id: newRoomCode, code: newRoomCode, ownerUid: myUid ?? '', gameId: undefined });
        navigate(`/lobby/${newRoomCode}`);
      } else {
        const code = (roomCodeInput || urlRoomCode || '').toUpperCase();
        await joinRoom(code, nickname.trim());
        setRoom({ id: code, code, ownerUid: roomData?.ownerUid || '', gameId: undefined });
      }
    } catch (joiningError: unknown) {
      const message = joiningError instanceof Error ? joiningError.message : 'Failed to enter the lobby';
      setError(message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveSeat = async () => {
    if (!mySeat || !room?.code) {
      return;
    }

    try {
      setError('');
      await leaveRoom(room.code);
    } catch (leaveError: unknown) {
      const message = leaveError instanceof Error ? leaveError.message : 'Failed to leave the seat';
      setError(message);
    }
  };

  const handleSelectClass = async (classId: string) => {
    if (!mySeat || takenClasses.includes(classId) || !room?.code) {
      setSelectedClassId(classId);
      return;
    }

    try {
      setError('');
      await selectClass(room.code, classId);
      setSelectedClassId(classId);
    } catch (classError: unknown) {
      const message = classError instanceof Error ? classError.message : 'Failed to select class';
      setError(message);
    }
  };

  const handleToggleReady = async () => {
    if (!mySeat?.classId || !room?.code) {
      return;
    }

    try {
      setError('');
      await updateSeatReady(room.code, !mySeat.ready);
    } catch (readyError: unknown) {
      const message = readyError instanceof Error ? readyError.message : 'Failed to update ready status';
      setError(message);
    }
  };

  const handleStartGame = async () => {
    if (!room?.code || !isOwner || !canStart) {
      return;
    }

    try {
      setError('');
      await startGame(room.code);
    } catch (startError: unknown) {
      const message = startError instanceof Error ? startError.message : 'Failed to launch the match';
      setError(message);
    }
  };

  const onboardingHeader = (
    <div className="flex items-center gap-3">
      <Icon name={BRAND_ART} alt="King of the Mountain crest" size={56} className="rounded-2xl shadow-[var(--kotm-shadow-card)]" />
      <div className="flex flex-col">
        <span className="text-label-sm uppercase tracking-[0.24em] text-text-muted">King of the Mountain</span>
        <span className="font-display text-title-md text-text-primary">Gather your party</span>
      </div>
    </div>
  );

  if (!room?.code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base px-4 py-12">
        <div className="flex w-full max-w-4xl flex-col gap-6 lg:flex-row">
          <Card tone="accent" className="flex h-full flex-col gap-6 lg:w-2/5">
            {onboardingHeader}
            <p className="text-body-md text-text-secondary">
              Create a new lobby for your friends or drop into an existing room with a six character code.
            </p>
            <Panel tone="muted" padding="sm" withBorder={false} className="rounded-2xl text-body-sm text-text-secondary">
              <strong className="block text-label-sm font-semibold uppercase tracking-wide text-text-primary">Quick tips</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Choose unique classes so passives can shine.</li>
                <li>Ready up after locking your class to arm the start button.</li>
                <li>Room owners can kick or start once everyone is set.</li>
              </ul>
            </Panel>
          </Card>

          <Panel tone="raised" className="flex flex-1 flex-col gap-4">
            <h2 className="font-display text-title-md text-text-primary">Join or create a lobby</h2>
            <Input
              label="Nickname"
              placeholder="What should we call you?"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
              required
              data-testid="input-nickname"
            />
            <Input
              label="Room code"
              description="Leave empty to open a fresh lobby."
              placeholder="ABC123"
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
              maxLength={6}
              data-testid="input-room-code"
            />

            {error ? (
              <Badge variant="danger" tone="soft" role="alert" className="w-fit">
                {error}
              </Badge>
            ) : null}

            <div className="mt-2 flex flex-col gap-3">
              <Button
                size="lg"
                variant="primary"
                onClick={handleJoinRoom}
                loading={isJoining}
                disabled={isJoining || !nickname.trim()}
                data-testid="btn-join-room"
              >
                {roomCodeInput ? 'Join Lobby' : 'Create Lobby'}
              </Button>
              <p className="text-label-sm text-text-muted">
                The room stays alive for two hours after the last player leaves, so you can reconnect if needed.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  const headerNode = (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex flex-col gap-2">
        <span className="text-label-sm uppercase tracking-[0.3em] text-text-muted">Lobby Overview</span>
        <h1 className="font-display text-display-sm text-text-primary">Room {room?.code}</h1>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Badge variant="neutral" tone="soft">{occupiedCount}/6 players</Badge>
        <Badge variant={readyCount === occupiedCount && occupiedCount >= 2 ? 'success' : 'warning'} tone="soft">
          {readyCount}/{occupiedCount} ready
        </Badge>
        {isOwner ? (
          <Badge variant="brand" tone="solid" aria-label="You are the room owner">
            Owner
          </Badge>
        ) : null}
      </div>
      <Panel tone="muted" padding="sm" withBorder className="flex items-center gap-3 rounded-full text-label-sm text-text-muted">
        <span>Invite code</span>
        <code className="rounded-full bg-surface-card px-4 py-1 font-semibold tracking-[0.3em] text-text-primary">
          {room?.code}
        </code>
      </Panel>
      {isOwner ? (
        <Button
          variant="primary"
          size="lg"
          onClick={handleStartGame}
          disabled={!canStart}
          data-testid="btn-start-game"
        >
          {canStart ? 'Start Match' : 'Waiting for all players'}
        </Button>
      ) : null}
    </div>
  );

  // Hero banner with subtle medieval flourish
  const heroPanel = (
    <Card tone="accent" className="w-full max-w-5xl text-center">
      <div className="flex flex-col items-center gap-4">
        <Icon
          name={BRAND_ART}
          alt="King of the Mountain crest"
          size={96}
          className="rounded-3xl shadow-[0_0_0_2px_rgba(234,179,8,0.15)]"
        />
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-title-md text-text-primary">
            Hear ye! Choose thy champions
          </h2>
          <p className="text-body-md text-text-secondary">
            Rally brave souls, bind oaths, and make ready for the ascent. Let each passive be a boon to thy fellowship.
          </p>
        </div>
      </div>
    </Card>
  );

  const footerNode = mySeat ? (
    <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:justify-center lg:text-left">
      <div className="flex flex-col gap-1 text-body-sm text-text-muted">
        <span className="font-semibold text-text-primary">Seated as {mySeat.nickname ?? 'Unnamed Adventurer'}.</span>
        <span>{mySeat.classId ? `Currently playing the ${CLASSES[mySeat.classId]?.name ?? 'hero'}.` : 'Choose a class to unlock your passive ability.'}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant={mySeat.ready ? 'secondary' : 'primary'}
          size="md"
          onClick={handleToggleReady}
          disabled={!mySeat.classId}
          data-testid="btn-ready"
        >
          {mySeat.ready ? 'Cancel Ready' : 'Mark Ready'}
        </Button>
        <Button variant="ghost" size="md" onClick={handleLeaveSeat} data-testid="btn-leave-seat">
          Leave Lobby
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 text-body-sm text-text-muted">
      <span>Loading your seat… if nothing appears, refresh or rejoin with the invite code.</span>
    </div>
  );

  return (
    <AppShell header={headerNode} footer={footerNode} gap="lg">
      <div className="col-span-full flex w-full flex-col items-center gap-8">
        {error ? (
          <Panel tone="muted" padding="sm" className="w-full max-w-4xl border-danger-500/40 text-danger-600" role="alert">
            {error}
          </Panel>
        ) : null}

        {heroPanel}

        <div className="col-span-full flex w-full flex-col gap-6">
          <Panel tone="raised" className="col-span-full flex flex-col gap-6" aria-labelledby="lobby-seats-heading">
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div>
                <h2 id="lobby-seats-heading" className="font-display text-title-sm text-text-primary">
                  Adventurer Roster
                </h2>
                <p className="text-body-sm text-text-secondary">
                  Track who is seated, their class choice, and their readiness for the climb.
                </p>
              </div>
              <Badge variant="brand" tone="soft">{occupiedCount}/6 adventurers</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {seats.map((seat) => {
                const isMine = seat.occupantUid === myUid;
                const isTaken = Boolean(seat.occupantUid);
                const seatLabel = seat.nickname || `Seat ${seat.seatIndex + 1}`;

                return (
                  <Card
                    key={seat.seatIndex}
                    interactive={isMine}
                    selected={isMine}
                    className="flex h-full flex-col justify-between gap-4"
                    data-testid={`seat-${seat.seatIndex}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 font-display text-title-sm text-brand-600">
                          {seat.nickname ? seat.nickname.charAt(0).toUpperCase() : seat.seatIndex + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-body-md font-semibold text-text-primary">{seatLabel}</span>
                          <span className="text-label-sm text-text-muted">
                            {seat.classId ? CLASSES[seat.classId]?.name ?? 'Class locked' : 'Waiting for class choice'}
                          </span>
                        </div>
                      </div>
                      <Badge variant={seat.ready ? 'success' : isTaken ? 'warning' : 'neutral'} tone="soft">
                        {seat.ready ? 'Ready' : isTaken ? 'Not Ready' : 'Open'}
                      </Badge>
                    </div>

                    {isMine ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={seat.ready ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={handleToggleReady}
                          disabled={!seat.classId}
                        >
                          {seat.ready ? 'Cancel Ready' : 'Ready Up'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLeaveSeat}>
                          Leave Lobby
                        </Button>
                      </div>
                    ) : !isTaken ? (
                      <span className="text-label-sm text-text-muted">Waiting for a challenger…</span>
                    ) : (
                      <span className="text-label-sm text-text-muted">
                        {seat.ready ? 'Standing by for the climb.' : 'Reviewing gear before the climb.'}
                      </span>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="rounded-2xl bg-surface-subtle/40 px-4 py-3 text-label-sm text-text-muted">
              {readyNames.length ? (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="font-semibold text-text-primary">Ready:</span>
                  {readyNames.map((name) => (
                    <Badge key={`ready-${name}`} variant="success" tone="soft">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span>No one has readied up yet.</span>
              )}
              {waitingNames.length ? (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="font-semibold text-text-primary">Still prepping:</span>
                  {waitingNames.map((name) => (
                    <Badge key={`waiting-${name}`} variant="warning" tone="soft">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </Panel>

          {/* Class selection area: centered grid with medieval accent */}
          <Panel tone="raised" className="col-span-full flex flex-col gap-6 lg:min-w-[64rem]" aria-labelledby="class-grid-heading">
            <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
              <div>
                <h2 id="class-grid-heading" className="font-display text-title-sm text-text-primary">
                  Choose Your Class
                </h2>
                <p className="text-body-sm text-text-secondary">Browse the roster and lock in a unique passive for the climb.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {CLASS_FILTERS.map((filter) => (
                  <Button
                    key={filter}
                    variant={classFilter === filter ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setClassFilter(filter)}
                  >
                    {CLASS_FILTER_LABELS[filter]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Centered grid - enforce via inline gridTemplateColumns to avoid Tailwind build quirks */}
            <div
              className="grid w-full place-items-stretch gap-4 mx-auto"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}
            >
              {filteredClasses.map(([classId, classData]) => {
                const isTaken = takenClasses.includes(classId);
                const isMine = mySeat?.classId === classId;
                const claimedBy = seatByClassId.get(classId)?.nickname;

                return (
                  <Card
                    key={classId}
                    interactive={!isTaken || isMine}
                    selected={selectedClassId === classId}
                    disabled={isTaken && !isMine}
                    className="flex h-full flex-col gap-4 border border-[rgba(234,179,8,0.14)]/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(0,0,0,0.04))]"
                    onClick={() => handleSelectClass(classId)}
                    onMouseEnter={() => setSelectedClassId(classId)}
                    onFocus={() => setSelectedClassId(classId)}
                    data-testid={`class-${classId}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-title-sm text-text-primary">{classData.name}</h3>
                      <Badge variant={isMine ? 'brand' : isTaken ? 'danger' : 'success'} tone="soft">
                        {isMine ? 'Your pick' : isTaken ? 'Taken' : 'Available'}
                      </Badge>
                    </div>

                    <Icon
                      name={CLASS_ART_FALLBACK}
                      alt={`${classData.name} illustration`}
                      size={112}
                      className="mx-auto rounded-2xl object-contain shadow-[0_0_0_1px_rgba(148,163,184,0.15)]"
                    />

                    <p className="flex-1 text-body-sm text-text-secondary">{classData.passive}</p>

                    {classData.startItems && classData.startItems.length ? (
                      <div className="text-label-sm text-text-muted">
                        Starts with: {classData.startItems.join(', ')}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-label-sm text-text-muted">
                        {isTaken && !isMine ? (
                          <span>Claimed by {claimedBy ?? 'another'}</span>
                        ) : (
                          <span className="text-text-secondary">Unclaimed</span>
                        )}
                      </div>
                      <Button
                        variant={isMine ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={isTaken && !isMine}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectClass(classId);
                        }}
                      >
                        {isMine ? 'Selected' : isTaken ? 'Taken' : 'Choose Class'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Panel tone="sunken" padding="lg" withBorder className="rounded-3xl">
              {selectedClass ? (
                <div className="flex flex-col gap-4 text-left">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-title-sm text-text-primary">{selectedClass.name}</h3>
                      {selectedClassCategories.map((category) => (
                        <Badge key={`${selectedClass.id}-${category}`} variant="brand" tone="soft">
                          {CLASS_FILTER_LABELS[category as ClassFilter]}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-body-sm text-text-secondary">{selectedClass.passive}</p>
                  </div>
                  {selectedClass.startItems?.length ? (
                    <div className="text-label-sm text-text-muted">
                      Starting kit: {selectedClass.startItems.join(', ')}
                    </div>
                  ) : null}
                  <div className="text-label-sm text-text-muted">
                    {selectedClassSeat
                      ? `Currently selected by ${selectedClassSeat.nickname ?? 'another player'}.`
                      : 'No one has locked this class yet.'}
                  </div>
                </div>
              ) : (
                <div className="text-body-sm text-text-muted">Select a class card to inspect its passive and starting gear.</div>
              )}
            </Panel>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
