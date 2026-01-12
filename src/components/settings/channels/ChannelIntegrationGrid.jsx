import React from 'react';
import ChannelIntegrationCard from './ChannelIntegrationCard';

const ChannelIntegrationGrid = ({ channels, comingSoonChannels, onAction }) => {
  return (
    <div className="space-y-10">
      {/* Active/Available Channels Section */}
      <section>
        <div className="mb-6">
          <h3 className="text-lg font-medium flex items-center gap-2">
            Integrações Disponíveis
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {channels.length}
            </span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Conecte seus canais de comunicação para centralizar o atendimento e automatizar processos.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <ChannelIntegrationCard
              key={channel.id}
              {...channel}
              onConnect={() => onAction('connect', channel)}
              onDisconnect={() => onAction('disconnect', channel)}
              onConfigure={() => onAction('configure', channel)}
            />
          ))}
        </div>
      </section>

      {/* Coming Soon Section */}
      {comingSoonChannels && comingSoonChannels.length > 0 && (
        <section>
          <div className="mb-6">
            <h3 className="text-lg font-medium">Em Breve</h3>
            <p className="text-sm text-muted-foreground">
              Novas integrações que estamos desenvolvendo para expandir suas possibilidades.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 opacity-80">
            {comingSoonChannels.map((channel) => (
              <ChannelIntegrationCard
                key={channel.id}
                {...channel}
                isComingSoon={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ChannelIntegrationGrid;