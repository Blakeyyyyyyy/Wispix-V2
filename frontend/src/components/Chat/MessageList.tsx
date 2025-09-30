import { MessageBubble } from './MessageBubble';
import { Message } from '../../types/chat';

interface MessageListProps {
  messages: Message[];
  onApprovePlan?: (planJSON: any) => void;
  onRejectPlan?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  onApprovePlan, 
  onRejectPlan 
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onApprovePlan={onApprovePlan}
          onRejectPlan={onRejectPlan}
        />
      ))}
    </div>
  );
}; 